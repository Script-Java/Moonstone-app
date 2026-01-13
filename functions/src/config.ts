import { defineSecret } from "firebase-functions/params";

export const vertexAiLocation = "us-central1";
export const ttsLocation = "us"; // Global or specific region

// Secrets (must be set via CLI: firebase functions:secrets:set STRIPE_KEY)
export const stripeKey = defineSecret("STRIPE_KEY");

// Constants
export const MODEL_NAME = "gemini-2.0-flash-exp";
export const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET;
