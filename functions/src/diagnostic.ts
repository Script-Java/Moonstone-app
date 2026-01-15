import { getStorage } from "firebase-admin/storage";
import { onCall } from "firebase-functions/v2/https";
import { VoiceKey } from "./tts";
import { generateDiagnosticTests } from "./tts-diagnostic";

/**
 * Cloud Function: Generate TTS Diagnostic Tests
 * 
 * Generates 4 test audio files and uploads them to Firebase Storage.
 * Returns download URLs for each test.
 */
export const generateDiagnosticAudio = onCall({
    cors: true,  // Allow CORS for all origins (needed for Expo web dev)
    maxInstances: 10,
}, async (request) => {
    const uid = request.auth?.uid || "anonymous";  // Allow anonymous for testing
    // if (!uid) throw new Error("Not authenticated");  // Commented out for web testing

    const { voiceKey } = request.data;
    const voice: VoiceKey = voiceKey || "gb_wavenet_d";

    console.log(`🧪 Generating diagnostic tests for user ${uid} with voice ${voice}`);

    try {
        // Generate all 4 tests
        const tests = await generateDiagnosticTests(voice);

        // Upload to Firebase Storage and get download URLs
        const storage = getStorage();
        const uploadPromises = tests.map(async (test) => {
            const fileName = `diagnostics/${uid}/test-${test.testNumber}.${test.extension}`;
            const file = storage.bucket().file(fileName);

            await file.save(test.audioBuffer, {
                metadata: {
                    contentType: test.contentType,
                    metadata: {
                        testNumber: test.testNumber.toString(),
                        testName: test.name,
                        description: test.description,
                    },
                },
            });

            // Make publicly accessible
            await file.makePublic();

            return {
                testNumber: test.testNumber,
                name: test.name,
                description: test.description,
                url: file.publicUrl(),
                contentType: test.contentType,
            };
        });

        const results = await Promise.all(uploadPromises);

        console.log(`✅ Generated ${results.length} diagnostic tests`);

        return {
            success: true,
            tests: results,
            message: "Diagnostic tests generated successfully",
        };
    } catch (err: any) {
        console.error("❌ Failed to generate diagnostics:", err);
        throw new Error(`Diagnostic generation failed: ${err.message}`);
    }
});
