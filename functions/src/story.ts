import { HttpsError, onCall } from "firebase-functions/v2/https";
import { admin, db, storage } from "./firebase";
import { generateStoryText, StoryInputs } from "./gemini";
import { GeminiVoiceKey, generateGeminiSpeech } from "./gemini-tts";
import { VOICE_PACK, VoiceKey } from "./tts";
import { hashInputs } from "./utils";

const DEV_ALLOW_UNAUTH = false;

function normalizeVoiceKey(voiceKey: unknown): VoiceKey {
  const key = String(voiceKey || "").trim() as VoiceKey;
  return VOICE_PACK[key] ? key : "gb_wavenet_d";
}

function normalizeGeminiVoiceKey(v: unknown): GeminiVoiceKey {
  const key = String(v || "").trim().toLowerCase() as GeminiVoiceKey;
  const allowed: GeminiVoiceKey[] = ["kore", "puck", "charon", "fenrir", "aoede"];
  return allowed.includes(key) ? key : "kore";
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

    const protagonist1 = data.protagonist1;
    const protagonist2 = data.protagonist2;
    const mood = data.mood;
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const storyLength = (data.storyLength as any) || "standard";
    const goodNightMessage = typeof data.goodNightMessage === "string" ? data.goodNightMessage : "";

    if (!protagonist1 || !protagonist2 || !mood) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const inputs: StoryInputs = { protagonist1, protagonist2, mood, tags, storyLength };

    const requestedVoiceKey = normalizeVoiceKey(data.voiceKey);

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const userDefaultVoiceKey = normalizeVoiceKey(userDoc.exists ? userDoc.data()?.defaultVoiceKey : "");

    const safeVoiceKey: VoiceKey = data.voiceKey ? requestedVoiceKey : userDefaultVoiceKey;

    // Gemini voice selection (separate from WaveNet pack)
    const safeGeminiVoiceKey = normalizeGeminiVoiceKey(data.geminiVoiceKey);

    const inputHash = hashInputs({
      ...inputs,
      voiceKey: safeVoiceKey,
      geminiVoiceKey: safeGeminiVoiceKey,
      goodNightMessage: goodNightMessage || "",
    });

    // 1) Idempotency
    const pastStories = await db
      .collection("stories")
      .where("ownerUid", "==", uid)
      .where("inputHash", "==", inputHash)
      .limit(1)
      .get();

    if (!pastStories.empty) {
      const doc = pastStories.docs[0];
      return { storyId: doc.id, ...(doc.data() as any), cached: true };
    }

    // 2) Deduct credit
    await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);

      if (!snap.exists) {
        t.set(userRef, {
          uid,
          email: request.auth?.token.email || "dev@moonstone.app",
          credits: 2,
          defaultVoiceKey: "gb_wavenet_d",
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
      // 3) Story text
      const storyContent = await generateStoryText(inputs, goodNightMessage);

      // 4) Gemini TTS -> MP3
      const audioBuffer = await generateGeminiSpeech(storyContent.text, safeGeminiVoiceKey);

      // 5) Upload MP3
      const storyId = db.collection("stories").doc().id;
      const filePath = `audio/${uid}/${storyId}.mp3`;

      const bucket = storage.bucket();
      const file = bucket.file(filePath);

      await file.save(audioBuffer, {
        resumable: false,
        metadata: {
          contentType: "audio/mpeg",
          cacheControl: "private, max-age=3600",
          metadata: { ownerUid: uid, generatedBy: "gemini-tts", geminiVoiceKey: safeGeminiVoiceKey },
        },
      });

      // 6) Firestore
      const storyData = {
        ownerUid: uid,
        inputs,
        inputHash,
        voiceKey: safeVoiceKey,
        geminiVoiceKey: safeGeminiVoiceKey,
        goodNightMessage: goodNightMessage || null,
        title: storyContent.title,
        text: storyContent.text,
        audioPath: filePath,
        wordCount: storyContent.wordCount,
        durationSec: storyContent.durationSec,
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const batch = db.batch();
      const storyRef = db.collection("stories").doc(storyId);
      const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyId);

      batch.set(storyRef, storyData);
      batch.set(libraryRef, {
        storyId,
        title: storyContent.title,
        mood: inputs.mood,
        voiceKey: safeVoiceKey,
        geminiVoiceKey: safeGeminiVoiceKey,
        durationSec: storyContent.durationSec,
        isFavorite: false,
        progress: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastPlayedAt: null,
      });

      await batch.commit();

      return { storyId, ...storyData, cached: false };
    } catch (error: any) {
      console.error("Story generation failed:", error);

      try {
        await refundOneCredit();
      } catch (refundErr) {
        console.error("Credit refund failed:", refundErr);
      }

      // Check if it's a rate limiting error
      const msg = String(error?.message || "");
      if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
        throw new HttpsError(
          "resource-exhausted",
          "AI is busy right now. Please try again in 30-60 seconds."
        );
      }

      // For all other errors, return internal with the message
      throw new HttpsError("internal", `Generation failed: ${error?.message || String(error)}`);
    }
  });
