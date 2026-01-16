const fs = require("fs");
const path = require("path");
const { VertexAI } = require("@google-cloud/vertexai");

// Initialize Vertex AI
const PROJECT_ID = process.env.GCLOUD_PROJECT || "moonstone-4ffb6";
const LOCATION = "us-central1";

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

// Preview text - same for all voices for fair comparison
const PREVIEW_TEXT =
    "Welcome to Moonstone. Take a slow breath in... and gently exhale. " +
    "Let your shoulders soften. You're safe here. " +
    "When you're ready, allow your thoughts to drift like clouds across the night sky.";

// Gemini voice names (must match your GEMINI_VOICES in gemini-tts.ts)
const VOICES = {
    kore: "Kore",
    puck: "Puck",
    charon: "Charon",
    fenrir: "Fenrir",
    aoede: "Aoede",
};

const OUT_DIR = path.join(__dirname, "voice-previews");
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function generatePreview(voiceKey, voiceName) {
    console.log(`Generating preview for ${voiceKey} (${voiceName})...`);

    const model = vertexAI.preview.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
    });

    const request = {
        contents: [
            {
                role: "user",
                parts: [{ text: PREVIEW_TEXT }],
            },
        ],
        generationConfig: {
            responseModalities: "audio",
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
        },
    };

    try {
        const response = await model.generateContent(request);

        // Extract audio data
        const audioData = response.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!audioData) {
            throw new Error(`No audio data returned for ${voiceKey}`);
        }

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioData, "base64");

        // Save to file
        const outPath = path.join(OUT_DIR, `${voiceKey}.mp3`);
        fs.writeFileSync(outPath, audioBuffer);

        console.log(`✅ Saved: ${outPath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
    } catch (error) {
        console.error(`❌ Failed to generate ${voiceKey}:`, error.message);
        throw error;
    }
}

async function main() {
    console.log(`📁 Output directory: ${OUT_DIR}`);
    console.log(`🎙️  Generating ${Object.keys(VOICES).length} voice previews...\n`);

    for (const [key, name] of Object.entries(VOICES)) {
        await generatePreview(key, name);
        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("\n✅ All voice previews generated successfully!");
    console.log("\n📤 Next steps:");
    console.log("1. Upload files to Firebase Storage:");
    console.log("   - Go to Firebase Console > Storage");
    console.log("   - Create folder: public/voice-previews/");
    console.log(`   - Upload all ${Object.keys(VOICES).length} MP3 files from: ${OUT_DIR}`);
    console.log("2. Update Storage rules to allow public read");
    console.log("3. Update preview.ts to serve static URLs");
}

main().catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
});
