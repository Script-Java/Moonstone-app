
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const PROJECT_ID = "moonstone-4ffb6";
const LOCATION = "us-central1";
const MODEL_NAME = "gemini-2.5-flash";

async function testGemini() {
    console.log(`Testing model: ${MODEL_NAME} in project: ${PROJECT_ID}`);

    const ai = new GoogleGenAI({
        vertexai: true,
        project: PROJECT_ID,
        location: LOCATION,
    });

    const prompt = `
    You are a creative storyteller.
    Generate a very short story (under 50 words) about a robot learning to love.
    Return ONLY valid JSON with this structure:
    {
        "title": "string",
        "content": "string",
        "durationSec": 10
    }
    `;

    try {
        console.log("Sending request...");
        const result = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                maxOutputTokens: 500,
                temperature: 1.0,
                topP: 0.9,
                responseMimeType: "application/json",
            }
        });

        console.log("Request complete.");
        const text = result.text;
        console.log("Gemini Raw Response:", text);

        if (!text) {
            console.error("No text returned!");
            return;
        }

        try {
            const parsed = JSON.parse(text);
            console.log("Parsed JSON:", JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.error("Failed to parse JSON:", e);
        }

    } catch (error: any) {
        console.error("Error generating content:", error);
        if (error.response) {
            console.error("Error Response Body:", JSON.stringify(error.response, null, 2));
        }
    }
}

testGemini();
