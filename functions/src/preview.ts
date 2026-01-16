import { HttpsError, onCall } from "firebase-functions/v2/https";
import { storage } from "./firebase";
import { GEMINI_VOICES, GeminiVoiceKey, generateGeminiVoicePreview } from "./gemini-tts";

export const previewVoice = onCall({
    cors: true,
    memory: "512MiB",
    invoker: "public"
}, async (request) => {
    const { voiceKey } = request.data || {};

    // Validate against Gemini voices now
    if (!voiceKey || !GEMINI_VOICES[voiceKey as GeminiVoiceKey]) {
        throw new HttpsError(
            "invalid-argument",
            `Invalid voice key. Must be one of: ${Object.keys(GEMINI_VOICES).join(", ")}`
        );
    }

    const typedVoiceKey = voiceKey as GeminiVoiceKey;

    // Generate preview audio using Gemini TTS
    const audioBuffer = await generateGeminiVoicePreview(typedVoiceKey);

    const bucket = storage.bucket();
    // Use MP3 extension since Gemini TTS returns MP3
    const filePath = `previews/${typedVoiceKey}.mp3`;
    const file = bucket.file(filePath);

    try {
        const [exists] = await file.exists();

        if (exists) {
            // File already exists, return public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
            return { url: publicUrl, cached: true };
        }

        // Save the file
        await file.save(audioBuffer, {
            resumable: false,
            metadata: {
                contentType: "audio/mpeg", // Always MP3 for Gemini
                cacheControl: "public, max-age=86400",
                metadata: {
                    voiceKey: typedVoiceKey,
                    generatedAt: new Date().toISOString(),
                },
            },
        });

        // Make the file publicly accessible (no auth required)
        await file.makePublic();

        // Return public URL (no signing needed)
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        return { url: publicUrl, cached: false };
    } catch (error: any) {
        console.error(`❌ Failed to generate preview for ${voiceKey}:`, error);
        throw new HttpsError("internal", `Preview generation failed: ${error?.message || String(error)}`);
    }
});
