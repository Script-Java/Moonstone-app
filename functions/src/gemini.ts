// gemini.ts
import { VertexAI } from "@google-cloud/vertexai";
import { MODEL_NAME, vertexAiLocation } from "./config";

/**
 * Gemini story generator (Vertex AI)
 * - Sanitizes inputs
 * - Requests JSON output using Controlled Generation (JSON Mode)
 * - Returns durationSec (seconds) so story.ts can store it correctly
 */

// ---- Schemas (Controlled Generation) ----
const fullStorySchema = {
    type: "object",
    properties: {
        title: { type: "string" },
        paragraphs: {
            type: "array",
            items: { type: "string" }
        }
    },
    required: ["title", "paragraphs"]
};

const continuationSchema = {
    type: "object",
    properties: {
        paragraphs: {
            type: "array",
            items: { type: "string" }
        }
    },
    required: ["paragraphs"]
};

// ---- Configuration ----
const lengthConfig = {
    short: { minWords: 200, maxWords: 320, minParas: 5, maxParas: 8, description: "brief and focused" },
    standard: { minWords: 320, maxWords: 520, minParas: 8, maxParas: 12, description: "moderate length" },
    long: { minWords: 650, maxWords: 1100, minParas: 12, maxParas: 18, description: "extended and detailed" },
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
            model: MODEL_NAME, // Pinned stable version
            // @ts-ignore
            systemInstruction: {
                role: 'system',
                parts: [{ text: "JSON server. RAW JSON ONLY. NO MARKDOWN." }]
            },
            // ELITE FIX: Relax safety settings to prevent empty responses
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }
            ],
            generation_config: {
                max_output_tokens: 2048,
                temperature: 0.75, // The "Sweet Spot" for creative bedtime stories
                top_p: 0.95,
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



async function genOnce(prompt: string, schema?: any) {
    const model = getModel();

    const request: any = {
        contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    // If schema is provided, force JSON mode
    if (schema) {
        request.generationConfig = {
            responseMimeType: "application/json",
            responseSchema: schema
        };
    }

    const result = await withRetry429(() => model.generateContent(request));
    const raw = extractTextFromVertexResponse((result as any).response);

    // THE DEBUGGER:
    if (!raw || !raw.includes("{")) {
        console.error("🚨 GEMINI FAILED TO OUTPUT JSON. RAW RESPONSE:", JSON.stringify((result as any).response, null, 2));
    }

    if (!raw) throw new Error("No content generated from Gemini.");

    // Robust Parsing: Find first '{' and last '}' to ignore "shame/ny" or markdown
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
        console.error("No JSON found. Model might be blocked or empty.");
        // Return a default "Fall-back" story object instead of throwing
        return {
            title: "A Quiet Night",
            paragraphs: ["The world is still and calm.", "It is time to rest now."]
        };
    }

    const jsonOnly = raw.substring(firstBrace, lastBrace + 1);

    try {
        return JSON.parse(jsonOnly);
    } catch (e) {
        console.warn("JSON parse failed on extracted output:", jsonOnly);
        throw e;
    }
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

FORBIDDEN AL TROPES
- Never use words like: "unfold," "tapestry," "vibrant," "symphony," "dance," or "whispered secrets."
- Avoid starting paragraphs with "With a..." or "As the..." 
- No moralizing. Don't tell us they are "ready for dreams"—just describe the heavy feeling in their limbs.

THE PROGRESSION OF STILLNESS (Must follow)
- ACT 1 (Introduction): Use rich, atmospheric descriptions. Establish the physical space. (Sentence length: 12-20 words).
- ACT 2 (Immersion): Focus on internal feelings—warmth, safety, and the "Digital Heartbeat." (Sentence length: 8-15 words).
- ACT 3 (The Fade): Move to very simple, sparse language. Paragraphs should become shorter. Focus on the breath. (Sentence length: 3-8 words).

CRITICAL NARRATION RULES (Elite Standard)
✓ Use a "Cadence of Calm": Alternate between short sentences (4-6 words) and medium, flowing sentences (12-18 words).
✓ Use Polysyndeton: Occasionally use "and" to link soft actions (e.g., "The leaves rustled and the air cooled and the world grew quiet.") This creates a hypnotic, never-ending feeling.
✓ Alliteration & Assonance: Use soft sounds like 's', 'm', 'l', and 'w' to create a "shushing" phonetic quality.
✓ Sensory Stacking: Every paragraph should contain one specific, non-visual sense (the scent of cedar, the weight of a quilt, the distant hum of wind).

STYLE RULES (required)
- Warm, simple words.
- No suspense, conflict, danger, loud humor, or plot twists.
- Avoid lists and dramatic metaphors.

Output the result as RAW JSON only. Do not use Markdown backticks. Do not include any text before or after the JSON object.
`;

    // 1. Generate initial story
    let data = await genOnce(prompt, fullStorySchema);

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
- Output ONLY valid JSON using the schema.`;

            try {
                const extra = await genOnce(continuePrompt, continuationSchema);

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
