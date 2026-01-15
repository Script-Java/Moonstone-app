import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { VOICE_PACK, VoiceKey } from "./tts";

let client: TextToSpeechClient | null = null;
function getClient() {
  if (!client) client = new TextToSpeechClient();
  return client;
}

/**
 * Diagnostic Test Suite for TTS Quality
 *
 * Key rule: NEVER chunk by ". " or sentence splits.
 * Chunk only by paragraphs or max characters to avoid robotic cadence.
 */

export const DIAGNOSTIC_TEXT =
  `Close your eyes and take a slow breath.\n\n` +
  `You're safe here in this quiet moment.\n\n` +
  `Let the day fade away like gentle waves returning to the sea.\n\n` +
  `Feel your body relax as you sink deeper into comfort.`;

function escapeForSSML(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Minimal SSML: paragraphs + small break between paragraphs */
function textToMinimalSSML(text: string, breakMs = 450): string {
  const paragraphs = String(text ?? "")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const joined = paragraphs
    .map((p) => `<p>${escapeForSSML(p)}</p>`)
    .join(`<break time="${breakMs}ms"/>`);

  return `<speak>${joined}</speak>`;
}

/** Safe chunking: paragraphs grouped up to maxChars */
function chunkByParagraphs(text: string, maxChars = 1200): string[] {
  const paragraphs = String(text ?? "")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf: string[] = [];
  let len = 0;

  for (const p of paragraphs) {
    if (p.length > maxChars) {
      if (buf.length) chunks.push(buf.join("\n\n"));
      chunks.push(p);
      buf = [];
      len = 0;
      continue;
    }

    if (len + p.length > maxChars && buf.length) {
      chunks.push(buf.join("\n\n"));
      buf = [p];
      len = p.length;
    } else {
      buf.push(p);
      len += p.length;
    }
  }

  if (buf.length) chunks.push(buf.join("\n\n"));
  return chunks;
}

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

export interface DiagnosticTestResult {
  testNumber: number;
  name: string;
  description: string;
  audioBuffer: Buffer;
  contentType: string;
  extension: string;
  notes?: string;
}

async function synthMp3Text(v: any, text: string) {
  return await getClient().synthesizeSpeech({
    input: { text },
    voice: { languageCode: v.languageCode, name: v.voiceName },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.94,
      pitch: 0,
    },
  });
}

async function synthMp3Ssml(v: any, ssml: string) {
  return await getClient().synthesizeSpeech({
    input: { ssml },
    voice: { languageCode: v.languageCode, name: v.voiceName },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 0.94,
      pitch: 0,
    },
  });
}

async function synthLinear16Text(v: any, text: string, sampleRate = 24000) {
  return await getClient().synthesizeSpeech({
    input: { text },
    voice: { languageCode: v.languageCode, name: v.voiceName },
    audioConfig: {
      audioEncoding: "LINEAR16",
      speakingRate: 0.94,
      pitch: 0,
      sampleRateHertz: sampleRate,
    },
  });
}

async function synthLinear16Ssml(v: any, ssml: string, sampleRate = 24000) {
  return await getClient().synthesizeSpeech({
    input: { ssml },
    voice: { languageCode: v.languageCode, name: v.voiceName },
    audioConfig: {
      audioEncoding: "LINEAR16",
      speakingRate: 0.94,
      pitch: 0,
      sampleRateHertz: sampleRate,
    },
  });
}

/**
 * Generate all diagnostic tests for a given voice.
 * Interpretation:
 * - If Test 1 sounds good but your app sounds bad => playback / upload / mime issue.
 * - If Test 1 sounds robotic => voice choice or expectations (or using wrong voiceName).
 * - If Test 1 good, Test 2 bad => SSML builder.
 * - If Test 1/2 good, Test 3 bad => WAV path/sample rate/player.
 * - If Test 3 good, Test 4 bad => chunking concatenation logic.
 */
export async function generateDiagnosticTests(
  voiceKey: VoiceKey = "gb_wavenet_d"
): Promise<DiagnosticTestResult[]> {
  const key: VoiceKey = VOICE_PACK[voiceKey] ? voiceKey : "gb_wavenet_d";
  const v = VOICE_PACK[key];

  const results: DiagnosticTestResult[] = [];

  // Test 1: MP3, no SSML, single call (true baseline)
  console.log("🧪 Test 1: MP3, no SSML, single call");
  const [r1] = await synthMp3Text(v, DIAGNOSTIC_TEXT.replace(/\n\n+/g, " "));
  if (!r1.audioContent) throw new Error("No audioContent for test 1");
  results.push({
    testNumber: 1,
    name: "Baseline (MP3, text)",
    description: "Closest to Google demo. If this is robotic, it’s not your SSML or WAV.",
    audioBuffer: Buffer.from(r1.audioContent as Uint8Array),
    contentType: "audio/mpeg",
    extension: "mp3",
  });

  // Test 2: MP3, minimal SSML, single call
  console.log("🧪 Test 2: MP3, minimal SSML, single call");
  const ssml2 = textToMinimalSSML(DIAGNOSTIC_TEXT, 450);
  const [r2] = await synthMp3Ssml(v, ssml2);
  if (!r2.audioContent) throw new Error("No audioContent for test 2");
  results.push({
    testNumber: 2,
    name: "MP3 + Minimal SSML",
    description: "If this becomes robotic vs Test 1, your SSML/pause strategy is the issue.",
    audioBuffer: Buffer.from(r2.audioContent as Uint8Array),
    contentType: "audio/mpeg",
    extension: "mp3",
  });

  // Test 3: WAV (LINEAR16), no SSML, single call
  console.log("🧪 Test 3: WAV (LINEAR16), text, single call");
  const [r3] = await synthLinear16Text(v, DIAGNOSTIC_TEXT.replace(/\n\n+/g, " "), 24000);
  if (!r3.audioContent) throw new Error("No audioContent for test 3");
  const wav3 = pcmToWav(Buffer.from(r3.audioContent as Uint8Array), 24000, 1);
  results.push({
    testNumber: 3,
    name: "WAV (LINEAR16) + Text",
    description: "If this sounds robotic vs MP3 tests, your WAV path / playback is the issue.",
    audioBuffer: wav3,
    contentType: "audio/wav",
    extension: "wav",
  });

  // Test 4: WAV + SSML + SAFE chunking
  console.log("🧪 Test 4: WAV + minimal SSML + paragraph chunking");
  const chunks = chunkByParagraphs(DIAGNOSTIC_TEXT, 900);
  const pcmBuffers: Buffer[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const ssml = textToMinimalSSML(chunks[i], 450);
    const [ri] = await synthLinear16Ssml(v, ssml, 24000);
    if (!ri.audioContent) throw new Error(`No audioContent for test 4 chunk ${i + 1}`);
    pcmBuffers.push(Buffer.from(ri.audioContent as Uint8Array));
  }

  const wav4 = pcmToWav(Buffer.concat(pcmBuffers), 24000, 1);
  results.push({
    testNumber: 4,
    name: "WAV + SSML + Chunking",
    description: "If only this sounds bad, chunking/concatenation is causing robotic seams.",
    audioBuffer: wav4,
    contentType: "audio/wav",
    extension: "wav",
    notes: `Chunks: ${chunks.length}`,
  });

  console.log("✅ All diagnostic tests generated");
  return results;
}
