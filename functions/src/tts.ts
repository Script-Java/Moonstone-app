import { TextToSpeechClient } from "@google-cloud/text-to-speech";

/**
 * ✅ This rewrite is focused on fixing the “robotic / weird breaks” issue by:
 * 1) Forcing a fixed sample rate (24000) AND matching the WAV header (prevents robotic playback).
 * 2) Removing aggressive calming-phrase breaks (they often cause unnatural robotic pausing).
 * 3) Setting pitch to 0 while you tune (pitch shifting commonly sounds synthetic).
 * 4) Using SIMPLE paragraph-only SSML breaks (consistent, human cadence).
 * 5) Keeping chunking optional and SAFE (default off). Turn it on only after baseline sounds human.
 *
 * Output: keep WAV (LINEAR16) so concatenation (if enabled later) is valid.
 */

let client: TextToSpeechClient | null = null;

function getClient() {
    if (!client) client = new TextToSpeechClient();
    return client;
}

/**
 * Curated Voice Configuration
 * Keep pitch = 0 by default (best baseline).
 * Speaking rate slightly slower than normal, but not so slow it becomes “robot drawl”.
 */
export const VOICE_PACK = {
    gb_wavenet_d: {
        name: "London Night",
        accent: "British",
        languageCode: "en-GB",
        voiceName: "en-GB-Wavenet-D",
        gender: "male",
        rate: 0.90,
        pitch: 0.0,
    },
    gb_wavenet_c: {
        name: "Soft British",
        accent: "British",
        languageCode: "en-GB",
        voiceName: "en-GB-Wavenet-C",
        gender: "female",
        rate: 0.92,
        pitch: 0.0,
    },
    us_wavenet_d: {
        name: "American Reader",
        accent: "American",
        languageCode: "en-US",
        voiceName: "en-US-Wavenet-D",
        gender: "male",
        rate: 0.92,
        pitch: 0.0,
    },
    us_wavenet_f: {
        name: "Warm Narrator",
        accent: "American",
        languageCode: "en-US",
        voiceName: "en-US-Wavenet-F",
        gender: "female",
        rate: 0.94,
        pitch: 0.0,
    },
} as const;

export type VoiceKey = keyof typeof VOICE_PACK;

/**
 * Escapes text for SSML (prevents broken SSML and odd artifacts).
 */
function escapeForSSML(s: string) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * SIMPLE SSML: paragraph-only pauses (no phrase injection).
 * This matches what the Google demo tends to do: natural pacing without weird stops.
 */
function textToSimpleSSML(text: string): string {
    const paragraphs = text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

    // 600ms between paragraphs is calmer but not “robot pause”
    const joined = paragraphs.map((p) => `<p>${escapeForSSML(p)}</p>`).join(`<break time="600ms"/>`);
    return `<speak>${joined}</speak>`;
}

/**
 * Optional chunking (OFF by default).
 * Use only after baseline sounds human. Chunking can introduce seams if used incorrectly.
 */
function chunkByParagraphs(text: string, maxChars = 1400): string[] {
    const paragraphs = text
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);

    const chunks: string[] = [];
    let buf: string[] = [];
    let len = 0;

    for (const p of paragraphs) {
        if (p.length > maxChars) {
            if (buf.length) {
                chunks.push(buf.join("\n\n"));
                buf = [];
                len = 0;
            }
            chunks.push(p);
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

/**
 * Wrap raw PCM into a WAV buffer (LINEAR16).
 * IMPORTANT: sampleRateHz must MATCH the synthesizeSpeech sampleRateHertz.
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
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRateHz, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    header.write("data", 36);
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
}

/**
 * Generate speech using curated voice key.
 *
 * Returns WAV (audio/wav). Make sure you upload with:
 * - filename ends with .wav
 * - contentType: "audio/wav"
 */
export async function generateSpeech(
    text: string,
    voiceKey: VoiceKey = "gb_wavenet_d",
    opts?: { chunking?: boolean }
): Promise<Buffer> {
    const key: VoiceKey = VOICE_PACK[voiceKey] ? voiceKey : "gb_wavenet_d";
    const v = VOICE_PACK[key];

    const chunkingEnabled = opts?.chunking === true;

    // Baseline: single request (matches Google demo behavior most closely)
    const chunks = chunkingEnabled ? chunkByParagraphs(text, 1400) : [text];

    const pcmBuffers: Buffer[] = [];
    for (let i = 0; i < chunks.length; i++) {
        const ssml = textToSimpleSSML(chunks[i]);

        const [response] = await getClient().synthesizeSpeech({
            input: { ssml },
            voice: { languageCode: v.languageCode, name: v.voiceName },
            audioConfig: {
                audioEncoding: "LINEAR16",
                speakingRate: v.rate,
                pitch: v.pitch,
                // ✅ critical: fix sample rate mismatch that causes “robotic” playback
                sampleRateHertz: 24000,
            },
        });

        if (!response.audioContent) throw new Error(`No audioContent from TTS (chunk ${i + 1})`);
        pcmBuffers.push(Buffer.from(response.audioContent));
    }

    const pcm = Buffer.concat(pcmBuffers);
    return pcmToWav(pcm, 24000, 1);
}

/**
 * Generate a short preview of a voice (WAV).
 */
export async function generateVoicePreview(voiceKey: VoiceKey): Promise<Buffer> {
    const previewText =
        "Close your eyes. Take a slow breath. You're safe here. Let the day fade away.";
    return generateSpeech(previewText, voiceKey, { chunking: false });
}
