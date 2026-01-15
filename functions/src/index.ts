import { onCall } from "firebase-functions/v2/https";
import { addToLibrary, deleteStory, toggleFavorite, updateProgress } from "./library";
import { previewVoice } from "./preview";
import { createStory } from "./story";

export const ping = onCall({ cors: true }, async () => {
    return { message: "pong", timestamp: Date.now() };
});

export * from "./diagnostic";
export * from "./user";
export { addToLibrary, createStory, deleteStory, previewVoice, toggleFavorite, updateProgress };

