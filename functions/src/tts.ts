import { TextToSpeechClient } from "@google-cloud/text-to-speech";

let client: TextToSpeechClient | null = null;
function getClient() {
  if (!client) client = new TextToSpeechClient();
  return client;
}

export const VOICE_PACK = {
  gb_wavenet_d: {
    name: "London Night",
    accent: "British",
    languageCode: "en-GB",
    voiceName: "en-GB-Wavenet-D",
    // Human baseline tuning
    rate: 0.94,
    pitch: 0,
  },
  gb_wavenet_c: {
    name: "Soft British",
    accent: "British",
    languageCode: "en-GB",
    voiceName: "en-GB-Wavenet-C",
    rate: 0.94,
    pitch: 0,
  },
  us_wavenet_d: {
    name: "American Reader",
    accent: "American",
    languageCode: "en-US",
    voiceName: "en-US-Wavenet-D",
    rate: 0.96,
    pitch: 0,
  },
  us_wavenet_f: {
    name: "Warm Narrator",
    accent: "American",
    languageCode: "en-US",
    voiceName: "en-US-Wavenet-F",
    rate: 0.96,
    pitch: 0,
  },
} as const;

export type VoiceKey = keyof typeof VOICE_PACK;

function escapeForSSML(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Minimal, natural SSML:
 * - paragraph tags
 * - small break between paragraphs
 * Avoid phrase-injection breaks (they cause “robot stops”).
 */
function textToSSML(text: string, paragraphBreakMs = 450): string {
  const paragraphs = String(text ?? "")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // If the model returns one huge paragraph, don’t force lots of breaks.
  const joined = paragraphs
    .map((p) => `<p>${escapeForSSML(p)}</p>`)
    .join(`<break time="${paragraphBreakMs}ms"/>`);

  return `<speak>${joined}</speak>`;
}

/**
 * WAV wrapping ONLY if you request LINEAR16.
 * If you default to MP3, you do NOT need this.
 */
function pcmToWav(pcm: Buffer, sampleRateHz = 24000, channels = 1): Buffer {
  const bitsPerSample = 16;
  const byteRate = (sampleRateHz * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);

  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRateHz, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

type OutputFormat = "mp3" | "wav";

export async function generateSpeech(
  text: string,
  voiceKey: VoiceKey = "gb_wavenet_d",
  opts?: {
    format?: OutputFormat;          // default mp3 (recommended)
    paragraphBreakMs?: number;      // default 450ms
    sampleRateHertz?: number;       // only for wav/LINEAR16
  }
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  const key: VoiceKey = VOICE_PACK[voiceKey] ? voiceKey : "gb_wavenet_d";
  const v = VOICE_PACK[key];

  const format = opts?.format ?? "mp3";
  const paragraphBreakMs = opts?.paragraphBreakMs ?? 450;

  const ssml = textToSSML(text, paragraphBreakMs);

  // ✅ Best baseline: MP3 (less artifact risk on web/expo)
  if (format === "mp3") {
    const [response] = await getClient().synthesizeSpeech({
      input: { ssml },
      voice: { languageCode: v.languageCode, name: v.voiceName },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: v.rate,
        pitch: v.pitch,
        // Optional: uncomment if you want device-specific tuning
        // effectsProfileId: ["headphone-class-device"],
      },
    });

    if (!response.audioContent) throw new Error("No audioContent from TTS (MP3)");
    const buffer = Buffer.from(response.audioContent as Uint8Array);

    return { buffer, contentType: "audio/mpeg", extension: "mp3" };
  }

  // WAV path (only use if you truly need PCM concatenation later)
  const sampleRateHertz = opts?.sampleRateHertz ?? 24000;

  const [response] = await getClient().synthesizeSpeech({
    input: { ssml },
    voice: { languageCode: v.languageCode, name: v.voiceName },
    audioConfig: {
      audioEncoding: "LINEAR16",
      speakingRate: v.rate,
      pitch: v.pitch,
      sampleRateHertz,
    },
  });

  if (!response.audioContent) throw new Error("No audioContent from TTS (LINEAR16)");
  const pcm = Buffer.from(response.audioContent as Uint8Array);
  const wav = pcmToWav(pcm, sampleRateHertz, 1);

  return { buffer: wav, contentType: "audio/wav", extension: "wav" };
}

export async function generateVoicePreview(voiceKey: VoiceKey) {
  const previewText =
    "Close your eyes. Take a slow breath. You're safe here. Let the day fade away.";

  return generateSpeech(previewText, voiceKey, {
    format: "mp3",          // ✅ preview in mp3 to sound best
    paragraphBreakMs: 500,
  });
}
