import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "us-central1" });

import { addToLibrary, deleteStory, toggleFavorite, updateProgress } from "./library";
import { previewVoice } from "./preview";
import { createStory, generateStoryAudio } from "./story";

export * from "./user";
export { addToLibrary, createStory, deleteStory, generateStoryAudio, previewVoice, toggleFavorite, updateProgress };

