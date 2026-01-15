import { HttpsError, onCall } from "firebase-functions/v2/https";
import { storage } from "./firebase";
import { generateVoicePreview, VOICE_PACK, VoiceKey } from "./tts";

export const previewVoice = onCall({ cors: true, memory: "512MiB" }, async (request) => {
    const { voiceKey } = request.data || {};

    if (!voiceKey || !VOICE_PACK[voiceKey as VoiceKey]) {
        throw new HttpsError(
            "invalid-argument",
            `Invalid voice key. Must be one of: ${Object.keys(VOICE_PACK).join(", ")}`
        );
    }

    const typedVoiceKey = voiceKey as VoiceKey;

    // Generate preview audio (returns { buffer, contentType, extension })
    const audio = await generateVoicePreview(typedVoiceKey);

    const bucket = storage.bucket();
    const filePath = `previews/${typedVoiceKey}.${audio.extension}`;
    const file = bucket.file(filePath);

    try {
        const [exists] = await file.exists();

        if (exists) {
            const [url] = await file.getSignedUrl({
                action: "read",
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
            });
            return { url, cached: true };
        }

        await file.save(audio.buffer, {
            resumable: false,
            metadata: {
                contentType: audio.contentType,
                cacheControl: "public, max-age=86400",
                metadata: {
                    voiceKey: typedVoiceKey,
                    generatedAt: new Date().toISOString(),
                },
            },
        });

        const [url] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        return { url, cached: false };
    } catch (error: any) {
        console.error(`❌ Failed to generate preview for ${voiceKey}:`, error);
        throw new HttpsError("internal", `Preview generation failed: ${error?.message || String(error)}`);
    }
});
