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
                max_output_tokens: 1200,
                temperature: 0.6,
                top_p: 0.9,
                // Note: responseMimeType and responseSchema aren't supported in this SDK version
                // Relying on prompt engineering + defensive JSON parsing instead
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

function validateStoryJson(data: any): { title: string; text: string } {
    if (!data || typeof data !== "object") throw new Error("Invalid story JSON.");

    const title = typeof data.title === "string" ? data.title.trim() : "";
    const paragraphs = Array.isArray(data.paragraphs) ? data.paragraphs : null;

    if (!title) throw new Error("Story JSON missing 'title'.");
    if (!paragraphs || paragraphs.length === 0) throw new Error("Story JSON missing 'paragraphs'.");

    const cleanParagraphs = paragraphs
        .map((p: any) => (typeof p === "string" ? p.replace(/\s+/g, " ").trim() : ""))
        .filter(Boolean);

    if (cleanParagraphs.length === 0) throw new Error("Story paragraphs empty.");

    return { title, text: cleanParagraphs.join("\n\n") };
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

// ---- Main ----
export async function generateStoryText(
    inputs: StoryInputs,
    goodNightMessage?: string
): Promise<{ title: string; text: string; durationSec: number; wordCount: number }> {
    const model = getModel();

    const lengthConfig = {
        short: { words: "200-300", description: "brief and focused" },
        standard: { words: "300-450", description: "moderate length" },
        long: { words: "500-700", description: "extended and detailed" },
    };

    const sanitized = sanitizeInputs(inputs);
    const config = lengthConfig[sanitized.storyLength];

    // Keep the JSON requirement but also do best-effort schema mode above.
    const prompt = `You are a bedtime narrator writing for spoken audio.

Write a soothing bedtime story designed to help someone fall asleep.
It must feel intimate, calm, and human—never exciting.

STORY DETAILS
- Characters: ${sanitized.protagonist1} and ${sanitized.protagonist2}
- Mood: ${sanitized.mood}
- Themes: ${sanitized.tags.join(", ") || "cozy comfort"}
- Length: ${config.description} (approximately ${config.words} words)

SLEEP STRUCTURE (required)
1) Soft beginning: establish safety and comfort.
2) Slow middle: gentle, low-stakes moments with calming sensory detail.
3) Fading ending: reduce activity and energy, slowly drifting into stillness.

CRITICAL NARRATION RULES (MUST FOLLOW)
✓ Every sentence must be SHORT (8-12 words maximum)
✓ Avoid commas when possible
✓ One idea per sentence
✓ If a sentence feels long, split it into two
✓ Never use nested clauses or complex structures
✓ Use simple subject-verb-object structure

Example of GOOD short sentences:
"The stars twinkled above. They cast gentle light. The meadow was quiet. ${sanitized.protagonist1} and ${sanitized.protagonist2} lay together. They felt peaceful."

Example of BAD long sentences (DO NOT DO THIS):
"The stars twinkled above them, casting gentle light over the quiet meadow where they lay together, feeling peaceful."

STYLE RULES (required)
- Short, simple, declarative sentences (8-12 words each).
- Use line breaks for gentle pauses (1–2 sentences per paragraph).
- Warm, simple words (no formal writing).
- No suspense, conflict, danger, loud humor, or plot twists.
- Avoid lists and dramatic metaphors.
- Include 1-2 calming "cadence anchor" phrases naturally in the story:
  * "It's okay."
  * "You're safe here."
  * "There's no rush."
  * "Just rest."
  * "You don't need to do anything."
- Avoid repeating phrases.

OUTPUT (strict)
Return ONLY valid JSON (no extra text) in this shape:
{
  "title": "string",
  "paragraphs": ["string", "string", "string"]
}
Rules:
- Each paragraph must be a single line (no newline characters inside strings).
- Use multiple paragraphs to create natural pauses and pacing.
- Do NOT include markdown fences or commentary.`;

    const result = await withRetry429(
        () =>
            model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
            })
    );

    const response = (result as any).response;
    const raw = extractTextFromVertexResponse(response);
    if (!raw) throw new Error("No content generated from Gemini.");

    const parsed = validateStoryJson(extractJsonObject(raw));

    let storyText = parsed.text;

    // Optional good night message appended with spacing
    if (goodNightMessage && goodNightMessage.trim()) {
        storyText += `\n\n${goodNightMessage.trim()}`;
    }

    const wordCount = storyText.split(/\s+/).filter(Boolean).length;

    return {
        title: parsed.title,
        text: storyText,
        wordCount,
        durationSec: estimateDurationSecFromWords(wordCount),
    };
}
