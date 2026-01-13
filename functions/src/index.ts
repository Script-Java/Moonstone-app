import { onCall } from "firebase-functions/v2/https";
import { createStory } from "./story";
import { addToLibrary, toggleFavorite, updateProgress, deleteStory } from "./library";
import { previewVoice } from "./preview";

export const ping = onCall({ cors: true }, async () => {
    return { message: "pong", timestamp: Date.now() };
});

export { createStory, addToLibrary, toggleFavorite, updateProgress, deleteStory, previewVoice };
export * from "./user";
