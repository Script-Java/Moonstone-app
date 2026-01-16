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
  kore: {
    name: "Kore",
    voiceName: "Kore",
    languageCode: "en-US",
    description: "Warm, friendly female voice",
  },
  puck: {
    name: "Puck",
    voiceName: "Puck",
    languageCode: "en-US",
    description: "Young, energetic male voice",
  },
  charon: {
    name: "Charon",
    voiceName: "Charon",
    languageCode: "en-US",
    description: "Mature, authoritative male voice",
  },
  fenrir: {
    name: "Fenrir",
    voiceName: "Fenrir",
    languageCode: "en-US",
    description: "Deep, resonant male voice",
  },
  aoede: {
    name: "Aoede",
    voiceName: "Aoede",
    languageCode: "en-US",
    description: "Melodic, soothing female voice",
  },
};

export type GeminiVoiceKey = keyof typeof GEMINI_VOICES;



export async function generateGeminiSpeech(
  text: string,
  voiceKey: GeminiVoiceKey = "kore"
): Promise<Buffer> {
  const client = getTTSClient();
  const voice = GEMINI_VOICES[voiceKey] || GEMINI_VOICES.kore;

  const cleanText = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!cleanText) throw new Error("Empty text for TTS.");

  console.log(`🎙️ Gemini TTS voice=${voice.name} model=${GEMINI_TTS_MODEL}`);

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text: cleanText }, // ✅ Revert to plain text (Gemini TTS doesn't support SSML yet)
      voice: {
        languageCode: voice.languageCode,
        name: voice.voiceName,
        modelName: GEMINI_TTS_MODEL,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
        pitch: 0,
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
    "Close your eyes. Take a slow breath. You're safe here. Let the day fade away.";
  return generateGeminiSpeech(previewText, voiceKey);
}
