// story.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin, db, storage } from "./firebase";
import { generateStoryText, StoryInputs } from "./gemini";
import { generateSpeech, VOICE_PACK, VoiceKey } from "./tts";
import { hashInputs } from "./utils";

const DEV_ALLOW_UNAUTH = false; // Enforcing authentication (production mode)

function normalizeVoiceKey(voiceKey: unknown): VoiceKey {
    const key = String(voiceKey || "").trim() as VoiceKey;
    return VOICE_PACK[key] ? key : "gb_wavenet_d";
}

export const createStory = onCall({ cors: true, memory: "1GiB" }, async (request) => {
    if (!DEV_ALLOW_UNAUTH && !request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in.");
    }

    const data = request.data || {};
    const uid = request.auth?.uid || "dev-user";

    const protagonist1 = data.protagonist1;
    const protagonist2 = data.protagonist2;
    const mood = data.mood;
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const storyLength = (data.storyLength as any) || "standard";
    const goodNightMessage = typeof data.goodNightMessage === "string" ? data.goodNightMessage : "";

    if (!protagonist1 || !protagonist2 || !mood) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const inputs: StoryInputs = {
        protagonist1,
        protagonist2,
        mood,
        tags,
        storyLength,
    };

    // Voice: request override OR user default OR fallback
    const requestedVoiceKey = normalizeVoiceKey(data.voiceKey);

    // If you want user defaultVoiceKey support, fetch it here:
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const userDefaultVoiceKey = normalizeVoiceKey(userDoc.exists ? userDoc.data()?.defaultVoiceKey : "");
    const safeVoiceKey: VoiceKey = data.voiceKey ? requestedVoiceKey : userDefaultVoiceKey;

    const inputHash = hashInputs({
        ...inputs,
        voiceKey: safeVoiceKey,
        goodNightMessage: goodNightMessage || "",
    });

    // 1) Idempotency (cached)
    const pastStories = await db
        .collection("stories")
        .where("ownerUid", "==", uid)
        .where("inputHash", "==", inputHash)
        .limit(1)
        .get();

    if (!pastStories.empty) {
        const doc = pastStories.docs[0];
        const cached = doc.data() as any;

        // Return audioPath for client to use with getDownloadURL
        return { storyId: doc.id, ...cached, cached: true };
    }

    // 2) Deduct credit (atomic)
    await db.runTransaction(async (t) => {
        const snap = await t.get(userRef);

        if (!snap.exists) {
            t.set(userRef, {
                uid,
                email: request.auth?.token.email || "dev@moonstone.app",
                credits: 2, // starter 3 - 1 used now
                defaultVoiceKey: "gb_wavenet_d",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return;
        }

        const currentCredits = Number(snap.data()?.credits || 0);

        if (DEV_ALLOW_UNAUTH) {
            const nextCredits = currentCredits < 5 ? 99 : currentCredits - 1;
            t.update(userRef, { credits: nextCredits });
            return;
        }

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
        // 3) Generate story text
        const storyContent = await generateStoryText(inputs, goodNightMessage);

        // 4) Generate WAV audio (tts.ts returns WAV buffer)
        const audioBuffer = await generateSpeech(storyContent.text, safeVoiceKey);

        // 5) Upload WAV to Storage
        const storyId = db.collection("stories").doc().id;
        const filePath = `audio/${uid}/${storyId}.wav`;

        const bucket = storage.bucket();
        const file = bucket.file(filePath);

        await file.save(audioBuffer, {
            metadata: {
                contentType: "audio/wav",
                cacheControl: "private, max-age=3600",
                metadata: { ownerUid: uid },
            },
            resumable: false,
        });

        // 6) Save Firestore (client will use getDownloadURL)
        const storyData = {
            ownerUid: uid,
            inputs,
            inputHash,
            voiceKey: safeVoiceKey,
            goodNightMessage: goodNightMessage || null,

            title: storyContent.title,
            text: storyContent.text, // optional later for privacy
            audioPath: filePath,
            wordCount: storyContent.wordCount,
            durationSec: storyContent.durationSec,

            status: "completed",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 7) Save Firestore
        const batch = db.batch();
        const storyRef = db.collection("stories").doc(storyId);
        const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyId);

        batch.set(storyRef, storyData);
        batch.set(libraryRef, {
            storyId,
            title: storyContent.title,
            mood: inputs.mood,
            voiceKey: safeVoiceKey,
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

        throw new HttpsError("internal", `Generation failed: ${error?.message || String(error)}`);
    }
});
