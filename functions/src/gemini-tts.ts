import { TextToSpeechClient } from "@google-cloud/text-to-speech";

/**
 * Gemini TTS using Cloud Text-to-Speech API
 * Model: gemini-2.5-flash-tts (set on voice.modelName)
 */
let ttsClient: TextToSpeechClient | null = null;
function getTTSClient() {
  if (!ttsClient) ttsClient = new TextToSpeechClient();
  return ttsClient;
}

export const GEMINI_TTS_MODEL = "gemini-2.5-flash-tts";

export interface GeminiVoiceConfig {
  name: string;
  voiceName: string;     // e.g. "Kore", "Puck"
  languageCode: string;  // e.g. "en-US"
  description: string;
}

export const GEMINI_VOICES: Record<string, GeminiVoiceConfig> = {
  aoede: {
    name: "Aoede",
    voiceName: "Aoede",
    languageCode: "en-US",
    description: "The Sleep Standard: Ethereal, breathy, and calm.",
  },
  kore: {
    name: "Kore",
    voiceName: "Kore",
    languageCode: "en-US",
    description: "The Caretaker: Warm, friendly, and comforting.",
  },
  puck: {
    name: "Puck",
    voiceName: "Puck",
    languageCode: "en-US",
    description: "The Storyteller: Young, energetic, and engaging.",
  },
  charon: {
    name: "Charon",
    voiceName: "Charon",
    languageCode: "en-US",
    description: "The Guide: Mature, authoritative, and steady.",
  },
  fenrir: {
    name: "Fenrir",
    voiceName: "Fenrir",
    languageCode: "en-US",
    description: "The Anchor: Deep, resonant, and grounding.",
  },
};

export type GeminiVoiceKey = keyof typeof GEMINI_VOICES;

// Compatibility alias for the rest of the app
export const VOICE_PACK = GEMINI_VOICES;
export type VoiceKey = GeminiVoiceKey;

export async function generateGeminiSpeech(
  text: string,
  voiceKey: GeminiVoiceKey = "aoede"
): Promise<Buffer> {
  const client = getTTSClient();
  const voice = GEMINI_VOICES[voiceKey] || GEMINI_VOICES.aoede;

  // ELITE NARRATION HACK: 
  // We replace periods with double-periods or ellipses to force the model 
  // to take a longer "breath" and lower its pitch at the end of thoughts.
  const processedText = String(text ?? "")
    .replace(/\. /g, "...  ") // Force a long pause + pitch drop
    .replace(/\? /g, "...  ") // Turn questions into soft statements
    .replace(/, /g, ",  ")    // Add a micro-gap after commas
    .trim();

  if (!processedText) throw new Error("Empty text for TTS.");

  console.log(`🎙️ Gemini TTS voice=${voice.name} model=${GEMINI_TTS_MODEL}`);

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: processedText },
      voice: {
        languageCode: voice.languageCode,
        name: voice.voiceName,
        modelName: GEMINI_TTS_MODEL,
      },
      audioConfig: {
        audioEncoding: "MP3",
        // 0.82 is the "sweet spot" for sleep. 
        // Anything lower than 0.75 sounds "drunk"; anything higher than 0.9 sounds "alert."
        speakingRate: 0.82,

        // Lowering pitch further (-2.5) removes the "tinny" AI digital artifacts 
        // and emphasizes the "chest voice" of the model.
        pitch: -2.5,

        // "wearable-class-device" has a tighter EQ curve for sleepbuds/AirPods
        // which reduces harsh 'S' sounds (sibilance).
        effectsProfileId: ["wearable-class-device"],
      },
    });

    if (!response.audioContent) {
      throw new Error("No audio content in Gemini TTS response");
    }

    return Buffer.isBuffer(response.audioContent)
      ? response.audioContent
      : Buffer.from(response.audioContent as Uint8Array);
  } catch (error: any) {
    console.error("❌ Gemini TTS generation failed:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
    });
    throw new Error(`Gemini TTS failed: ${error?.message || String(error)}`);
  }
}

export async function generateGeminiVoicePreview(
  voiceKey: GeminiVoiceKey
): Promise<Buffer> {
  const previewText =
    "The forest is quiet tonight. Soft moss covers the ground. The trees stand tall and still. A gentle breeze whispers through the leaves.";
  return generateGeminiSpeech(previewText, voiceKey);
}
