// preview.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { storage } from "./firebase";
import { generateVoicePreview, VOICE_PACK, VoiceKey } from "./tts";

/**
 * previewVoice Cloud Function
 * - Validates voiceKey
 * - Caches preview WAV in Storage
 * - ALWAYS returns a signed URL (consistent playback + private by default)
 */
export const previewVoice = onCall({ cors: true, memory: "512MiB" }, async (request) => {
    const { voiceKey } = request.data || {};

    // Validate voice key
    if (!voiceKey || !VOICE_PACK[voiceKey as VoiceKey]) {
        throw new HttpsError(
            "invalid-argument",
            `Invalid voice key. Must be one of: ${Object.keys(VOICE_PACK).join(", ")}`
        );
    }

    const typedVoiceKey = voiceKey as VoiceKey;
    const bucket = storage.bucket();
    const filePath = `previews/${typedVoiceKey}.wav`;
    const file = bucket.file(filePath);

    try {
        // If preview exists, return path for client getDownloadURL
        const [exists] = await file.exists();
        if (exists) {
            return { previewPath: filePath, cached: true, voiceKey: typedVoiceKey };
        }

        // Generate new preview (WAV)
        const audioBuffer = await generateVoicePreview(typedVoiceKey);

        // Save to Storage (private object; accessed via getDownloadURL on client)
        await file.save(audioBuffer, {
            resumable: false,
            metadata: {
                contentType: "audio/wav",
                cacheControl: "private, max-age=604800",
                metadata: {
                    voiceKey: typedVoiceKey,
                    generatedAt: new Date().toISOString(),
                },
            },
        });

        // Return path for client getDownloadURL
        return { previewPath: filePath, cached: false, voiceKey: typedVoiceKey };
    } catch (error: any) {
        console.error(`❌ Failed to generate preview for ${voiceKey}:`, error);
        throw new HttpsError("internal", `Preview generation failed: ${error?.message || String(error)}`);
    }
});
