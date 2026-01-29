import { HttpsError, onCall } from "firebase-functions/v2/https";
import { admin, db, storage } from "./firebase";
import { generateStoryText, StoryInputs } from "./gemini";
import { generateGeminiSpeech, VOICE_PACK, VoiceKey } from "./gemini-tts";
import { hashInputs } from "./utils";

const DEV_ALLOW_UNAUTH = false;

/**
 * Updated to default to 'aoede' for a high-end first impression.
 */
function normalizeVoiceKey(voiceKey: unknown): VoiceKey {
  const key = String(voiceKey || "").trim() as VoiceKey;
  return VOICE_PACK[key] ? key : "aoede";
}

export const createStory = onCall(
  { region: "us-central1", memory: "1GiB", timeoutSeconds: 540 },
  async (request) => {
    if (!DEV_ALLOW_UNAUTH && !request.auth) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const data = request.data || {};
    const uid = request.auth?.uid || (DEV_ALLOW_UNAUTH ? "dev" : "");

    if (!uid) {
      throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    // --- 1. Input Validation ---
    const { protagonist1, protagonist2, mood } = data;
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const storyLength = (data.storyLength as any) || "standard";
    const goodNightMessage = typeof data.goodNightMessage === "string" ? data.goodNightMessage : "";

    if (!protagonist1 || !protagonist2 || !mood) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const inputs: StoryInputs = { protagonist1, protagonist2, mood, tags, storyLength };
    const requestedVoiceKey = normalizeVoiceKey(data.voiceKey);

    // Note: We use the requested voice key for the hash, so specific voices are cached separately.
    // If we wanted to share text across voices, we'd hash text separately from audio, but simple-elite implies exact match.
    const safeVoiceKey: VoiceKey = requestedVoiceKey;

    // Dream Well Hash
    const storyHash = hashInputs({
      ...inputs,
      voiceKey: safeVoiceKey,
      goodNightMessage: goodNightMessage || "",
    });

    // --- 2. THE DREAM WELL (Cache Check) ---
    const storyRef = db.collection("stories").doc(storyHash);
    const existingStory = await storyRef.get();

    if (existingStory.exists) {
      console.log(`✨ Dream Well Hit! (Hash: ${storyHash})`);
      const storyData = existingStory.data()!;

      // Add to User's Library (Personal Copy of Reference)
      await db.collection("users").doc(uid).collection("library").doc(storyHash).set({
        storyId: storyHash,
        title: storyData.title,
        mood: inputs.mood,
        voiceKey: safeVoiceKey,
        durationSec: storyData.durationSec,
        isFavorite: false,
        progress: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPlayedAt: null,
        status: storyData.status || "completed"
      });

      // Return instantly - Cost: $0.00
      return { storyId: storyHash, ...storyData, cached: true };
    }

    // --- 3. Credit Transaction (Only on Miss) ---
    const userRef = db.collection("users").doc(uid);
    await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      if (!snap.exists) {
        t.set(userRef, {
          uid,
          email: request.auth?.token.email || "dev@moonstone.app",
          credits: 2,
          defaultVoiceKey: "aoede", // Updated default
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }
      const currentCredits = Number(snap.data()?.credits || 0);
      if (currentCredits < 1) throw new HttpsError("failed-precondition", "Not enough credits.");
      t.update(userRef, { credits: currentCredits - 1 });
    });

    async function refundOneCredit() {
      await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);
        if (!snap.exists) return;
        const currentCredits = Number(snap.data()?.credits || 0);
        t.update(userRef, { credits: currentCredits + 1 });
      });
    }

    try {
      // --- 4. Generation Pipeline (Text Only) ---
      // Generate the "Elite" rhythmic text
      const storyContent = await generateStoryText(inputs, goodNightMessage);

      // --- 5. Initial Storage (Global Dream Well) ---

      const storyData = {
        ownerUid: uid, // Original creator
        inputs,
        inputHash: storyHash,
        voiceKey: safeVoiceKey,
        title: storyContent.title,
        text: storyContent.text,
        audioPath: null, // Will be filled by background trigger
        wordCount: storyContent.wordCount,
        durationSec: storyContent.durationSec,
        status: "processing_audio", // Indicates waiting for audio
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const batch = db.batch();
      // Save directly to the Hash ID
      const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyHash);

      batch.set(storyRef, storyData);
      batch.set(libraryRef, {
        storyId: storyHash,
        title: storyContent.title,
        mood: inputs.mood,
        voiceKey: safeVoiceKey,
        durationSec: storyContent.durationSec,
        isFavorite: false,
        progress: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPlayedAt: null,
        status: "processing_audio"
      });

      await batch.commit();
      return { storyId: storyHash, ...storyData, cached: false };

    } catch (error: any) {
      console.error("Story generation failed:", error);
      await refundOneCredit();

      const msg = String(error?.message || "");
      if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
        throw new HttpsError("resource-exhausted", "AI is busy. Please try again in 30 seconds.");
      }
      throw new HttpsError("internal", `Generation failed: ${error?.message || String(error)}`);
    }
  }
);

import { onDocumentCreated } from "firebase-functions/v2/firestore";

/**
 * Background Trigger: Generates Audio for new stories.
 * Listens for new docs in 'stories/{storyId}' where status == 'processing_audio'.
 */
export const generateStoryAudio = onDocumentCreated(
  {
    document: "stories/{storyId}",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540 // 9 minutes for TTS 
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const storyData = snap.data();
    if (storyData.status !== "processing_audio") return;

    const storyId = event.params.storyId; // This is the HASH now
    const uid = storyData.ownerUid;
    const text = storyData.text;
    const voiceKey = storyData.voiceKey || "aoede";

    if (!text || !uid) {
      console.error(`Invalid story data for ${storyId}`);
      return;
    }

    try {
      console.log(`🎙️ Generating audio for story ${storyId} (${voiceKey})...`);

      // Generate TTS
      const audioBuffer = await generateGeminiSpeech(text, voiceKey as VoiceKey);

      // Upload to Storage (SHARED PATH)
      const filePath = `audio/shared/${storyId}.mp3`;
      const bucket = storage.bucket();
      const file = bucket.file(filePath);

      await file.save(audioBuffer, {
        resumable: false,
        metadata: {
          contentType: "audio/mpeg",
          cacheControl: "private, max-age=3600",
          metadata: { ownerUid: uid, generatedBy: "gemini-tts", geminiVoiceKey: voiceKey },
        },
      });

      // Update Story & Library
      await db.runTransaction(async (t) => {
        const storyRef = db.collection("stories").doc(storyId);

        // We also want to update the CREATOR'S library status
        // Note: OTHER users who add this later will get the status from the storyDoc directly
        const libRef = db.collection("users").doc(uid).collection("library").doc(storyId);

        t.update(storyRef, {
          audioPath: filePath,
          status: "completed"
        });

        // Ensure library reflects completion
        t.update(libRef, {
          status: "completed"
        });
      });

      console.log(`✅ Audio generated for ${storyId}`);

    } catch (err) {
      console.error(`❌ Audio generation failed for ${storyId}:`, err);
      // Update status to 'failed' so UI usually knows.
      await db.collection("stories").doc(storyId).update({ status: "failed_audio" });
      await db.collection("users").doc(uid).collection("library").doc(storyId).update({ status: "failed_audio" });
    }
  }
);