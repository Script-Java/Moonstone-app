// gemini.ts
import { VertexAI } from "@google-cloud/vertexai";
import { MODEL_NAME, vertexAiLocation } from "./config";

/**
 * Gemini story generator (Vertex AI)
 * - Sanitizes inputs
 * - Requests JSON output (best-effort)
 * - Robustly extracts JSON from model output
 * - Returns durationSec (seconds) so story.ts can store it correctly
 */

// ---- Configuration ----
const lengthConfig = {
    short: { minWords: 200, maxWords: 320, minParas: 8, maxParas: 12, description: "brief and focused" },
    standard: { minWords: 320, maxWords: 520, minParas: 12, maxParas: 18, description: "moderate length" },
    long: { minWords: 650, maxWords: 1100, minParas: 22, maxParas: 32, description: "extended and detailed" },
};

// ---- Lazy init to prevent cold start crashes ----
let model: any = null;

function getModel() {
    if (!model) {
        const vertex_ai = new VertexAI({
            project: process.env.GCLOUD_PROJECT || "moonstone-4ffb6",
            location: vertexAiLocation,
        });

        model = vertex_ai.getGenerativeModel({
            model: MODEL_NAME, // e.g. "gemini-2.0-flash-exp"
            generation_config: {
                max_output_tokens: 4096, // Raised ceiling for longer stories
                temperature: 0.45,
                top_p: 0.9,
            },
        });
    }
    return model;
}

// ---- Types ----
export interface StoryInputs {
    protagonist1: string;
    protagonist2: string;
    mood: string;
    tags: string[];
    storyLength?: "short" | "standard" | "long";
}

// ---- Helpers ----
function safeString(input: unknown, maxLen: number) {
    return String(input ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLen);
}

function sanitizeInputs(inputs: StoryInputs) {
    const protagonist1 = safeString(inputs.protagonist1, 60);
    const protagonist2 = safeString(inputs.protagonist2, 60);
    const mood = safeString(inputs.mood || "Calm", 30);

    const tags = (Array.isArray(inputs.tags) ? inputs.tags : [])
        .map((t) => safeString(t, 30))
        .filter(Boolean)
        .slice(0, 6);

    const storyLength: "short" | "standard" | "long" = inputs.storyLength || "standard";

    return { protagonist1, protagonist2, mood, tags, storyLength };
}

function extractTextFromVertexResponse(response: any): string {
    const parts = response?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) return "";
    return parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).join("");
}

function stripCodeFences(raw: string) {
    return raw
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function extractJsonObject(raw: string): any {
    const cleaned = stripCodeFences(raw);

    // 1) Best case: pure JSON
    try {
        return JSON.parse(cleaned);
    } catch { }

    // 2) Common case: extra text around JSON; extract a JSON object block.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model response.");
    return JSON.parse(match[0]);
}

function validateStoryJson(data: any): { title: string; paragraphs: string[] } {
    if (!data || typeof data !== "object") throw new Error("Invalid story JSON.");

    const title = typeof data.title === "string" ? data.title.trim() : "";
    const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : null;

    if (!title) throw new Error("Story JSON missing 'title'.");
    if (!paragraphs || paragraphs.length === 0) throw new Error("Story JSON missing 'paragraphs'.");

    const cleanParagraphs = paragraphs
        .map((p: any) => {
            if (typeof p !== "string") return "";
            const cleaned = p.replace(/\s+/g, " ").trim();
            if (cleaned.includes("\n")) throw new Error("Paragraph contains newline.");
            return cleaned;
        })
        .filter(Boolean);

    if (cleanParagraphs.length === 0) throw new Error("Story paragraphs empty.");

    return { title, paragraphs: cleanParagraphs };
}

// Helper for exponential backoff retry on 429/Resource Exhausted
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function withRetry429<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (e: any) {
            const msg = String(e?.message || "");
            const is429 = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || e?.code === 429;

            // If not a rate limit error, or it's the last try, throw it
            if (!is429 || i === retries - 1) throw e;

            console.log(`⚠️ Vertex AI 429/Resource Exhausted. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
            await sleep(delay);
            delay *= 2; // Exponential backoff: 1s, 2s, 4s...
        }
    }
    throw new Error("Unreachable retry loop end");
}

function estimateDurationSecFromWords(words: number): number {
    // Slower bedtime narration: 0.80 speaking rate = ~120 WPM (down from 150)
    const wpm = 120;
    const sec = Math.round((words / wpm) * 60);
    return Math.max(30, sec);
}



async function genOnce(prompt: string) {
    const model = getModel();
    const result = await withRetry429(() =>
        model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
    );
    const raw = extractTextFromVertexResponse((result as any).response);
    if (!raw) throw new Error("No content generated from Gemini.");
    return extractJsonObject(raw);
}

// ---- Main ----
export async function generateStoryText(
    inputs: StoryInputs,
    goodNightMessage?: string
): Promise<{ title: string; text: string; durationSec: number; wordCount: number }> {

    const sanitized = sanitizeInputs(inputs);
    const cfg = lengthConfig[sanitized.storyLength];

    const prompt = `You are a bedtime narrator writing for spoken audio.

Write a soothing bedtime story designed to help someone fall asleep.
It must feel intimate, calm, and human—never exciting.

STORY DETAILS
- Characters: ${sanitized.protagonist1} and ${sanitized.protagonist2}
- Mood: ${sanitized.mood}
- Themes: ${sanitized.tags.join(", ") || "cozy comfort"}
- Length: ${cfg.description}

LENGTH REQUIREMENT (hard)
- Target ${cfg.minWords}-${cfg.maxWords} words total.
- Use ${cfg.minParas}-${cfg.maxParas} paragraphs.
- Each paragraph is 1–2 short sentences.

SLEEP STRUCTURE (required)
1) Soft beginning: establish safety and comfort.
2) Slow middle: gentle, low-stakes moments with calming sensory detail.
3) Fading ending: reduce activity and energy, slowly drifting into stillness.

ENDING RULE (required)
In the last 3–5 paragraphs, everything slows down.
Use quieter language and shorter sentences.
Include a gentle cue for sleep without commanding.

QUALITY RULE (required)
Across the story, include gentle sensory detail:
warmth, soft light, gentle sounds, cozy textures, slow breathing.
Do not overdo it. Spread it out naturally.

CRITICAL NARRATION RULES (MUST FOLLOW)
✓ Most sentences 8–12 words, occasionally up to 16 for natural flow
✓ Avoid commas when possible
✓ One idea per sentence
✓ If a sentence feels long, split it into two
✓ Never use nested clauses or complex structures
✓ Use simple subject-verb-object structure

Example of GOOD sentences:
"The stars twinkled above. They cast gentle light. The meadow was quiet and still. ${sanitized.protagonist1} and ${sanitized.protagonist2} lay together. They felt peaceful."

Example of BAD long sentences (DO NOT DO THIS):
"The stars twinkled above them, casting gentle light over the quiet meadow where they lay together, feeling peaceful."

STYLE RULES (required)
- Short, simple, declarative sentences.
- Use line breaks for gentle pauses.
- Warm, simple words.
- No suspense, conflict, danger, loud humor, or plot twists.
- Avoid lists and dramatic metaphors.
- Include 1-2 calming "cadence anchor" phrases naturally in the story:
  * "It's okay."
  * "You're safe here."
  * "There's no rush."
  * "Just rest."
  * "You don't need to do anything."

OUTPUT (strict)
Return ONLY valid JSON (no extra text) in this shape:
{
  "title": "string",
  "paragraphs": ["string", "string", ...]
}

Rules:
- paragraphs array length must be ${cfg.minParas}-${cfg.maxParas}.
- No newline characters inside any paragraph string.
- JSON only. No extra text.
`;

    // 1. Generate initial story
    let data = await genOnce(prompt);

    // 2. Validate basic structure
    let parsed = validateStoryJson(data);

    // 3. Check length and extend if necessary
    let storyText = parsed.paragraphs.join("\n\n");
    let wordCount = storyText.split(/\s+/).filter(Boolean).length;

    // Check if under minWords OR under minParas
    if (wordCount < cfg.minWords || parsed.paragraphs.length < cfg.minParas) {
        const remaining = cfg.maxParas - parsed.paragraphs.length;
        // If we have very few paragraphs, ensure we add at least a few, even if word count is ok-ish
        // If we are short on words, adding more paras helps.
        // We cap at 10 new ones.
        const addCount = Math.max(0, Math.min(10, remaining));

        if (addCount > 0) {
            console.log(`Story too short (Words: ${wordCount}, Paras: ${parsed.paragraphs.length}). Extending by ~${addCount} paragraphs...`);
            const continuePrompt = `Continue the SAME bedtime story with MORE paragraphs.
Rules:
- Keep the same style and characters.
- Add exactly ${addCount} new paragraphs.
- Return ONLY valid JSON in this shape:
{ "paragraphs": ["string", "string", ...] }
- Do not include title.
- JSON only, no extra text.`;

            try {
                const extra = await genOnce(continuePrompt);

                if (Array.isArray(extra?.paragraphs)) {
                    // Merge raw JSON data: existing title, appended paragraphs
                    data.paragraphs = [...data.paragraphs, ...extra.paragraphs];

                    // Clamp to maxParas
                    data.paragraphs = data.paragraphs.slice(0, cfg.maxParas);

                    // Re-validate and re-calculate
                    parsed = validateStoryJson(data);
                    storyText = parsed.paragraphs.join("\n\n");
                    wordCount = storyText.split(/\s+/).filter(Boolean).length;
                }
            } catch (err) {
                console.warn("Failed to extend story, using original.", err);
            }
        }
    }

    // Enforce maxWords by trimming paragraphs if necessary
    while (wordCount > cfg.maxWords && parsed.paragraphs.length > cfg.minParas) {
        // Remove shortest paragraph near the end (excluding the very last one to keep ending intact)
        // Candidates: all except last
        const candidates = parsed.paragraphs.slice(0, -1);
        if (candidates.length === 0) break; // Should not happen given minParas check

        // Find index of shortest
        let shortestIdx = -1;
        let minLen = Infinity;

        candidates.forEach((p: string, i: number) => {
            const len = p.length; // Approximate check, or split words
            if (len < minLen) {
                minLen = len;
                shortestIdx = i;
            }
        });

        if (shortestIdx !== -1) {
            parsed.paragraphs.splice(shortestIdx, 1);
        } else {
            // Fallback
            parsed.paragraphs.splice(parsed.paragraphs.length - 2, 1);
        }

        storyText = parsed.paragraphs.join("\n\n");
        wordCount = storyText.split(/\s+/).filter(Boolean).length;
    }

    // Optional good night message appended with spacing
    if (goodNightMessage && goodNightMessage.trim()) {
        storyText += `\n\n${goodNightMessage.trim()}`;
        // Update word count to include message? Usually we count story words for duration, message is extra.
        // But for total duration it matters.
        const msgWords = goodNightMessage.trim().split(/\s+/).filter(Boolean).length;
        wordCount += msgWords;
    }

    return {
        title: parsed.title,
        text: storyText,
        wordCount,
        durationSec: estimateDurationSecFromWords(wordCount),
    };
}
