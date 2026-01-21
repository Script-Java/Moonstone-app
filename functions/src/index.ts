import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "us-central1" });

import { addToLibrary, deleteStory, toggleFavorite, updateProgress } from "./library";
import { previewVoice } from "./preview";
import { createStory } from "./story";

export * from "./user";
export { addToLibrary, createStory, deleteStory, previewVoice, toggleFavorite, updateProgress };

