import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin, db, storage } from "./firebase";


// 1. addToLibrary: Manually add a story (e.g. shared by a friend)
export const addToLibrary = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const { storyId } = request.data;
    if (!storyId) throw new HttpsError("invalid-argument", "Missing storyId");

    const uid = request.auth.uid;
    const storyRef = db.collection("stories").doc(storyId);
    const storyDoc = await storyRef.get();

    if (!storyDoc.exists) throw new HttpsError("not-found", "Story not found.");

    // Check if already in library
    const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyId);
    const existing = await libraryRef.get();
    if (existing.exists) return { success: true, message: "Already in library" };

    await libraryRef.set({
        storyId,
        storyRef,
        isFavorite: false,
        progress: 0,
        lastPlayedAt: admin.firestore.FieldValue.serverTimestamp(),
        title: storyDoc.data()?.title || "Untitled",
        mood: storyDoc.data()?.inputs?.mood || "Unknown"
    });

    return { success: true };
});

// 2. toggleFavorite
export const toggleFavorite = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const { storyId, isFavorite } = request.data;
    if (!storyId) throw new HttpsError("invalid-argument", "Missing storyId");

    const uid = request.auth.uid;
    const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyId);

    await libraryRef.update({
        isFavorite: !!isFavorite
    });

    return { success: true };
});

// 3. updateProgress
export const updateProgress = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const { storyId, progress } = request.data;
    if (!storyId || typeof progress !== 'number') throw new HttpsError("invalid-argument", "Invalid arguments");

    const uid = request.auth.uid;
    const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyId);

    await libraryRef.update({
        progress,
        lastPlayedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
});

// 4. deleteStory
export const deleteStory = onCall({ cors: true }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const { storyId } = request.data;
    if (!storyId) throw new HttpsError("invalid-argument", "Missing storyId");

    const uid = request.auth.uid;
    const libraryRef = db.collection("users").doc(uid).collection("library").doc(storyId);

    // Get the library entry to verify it exists
    const libDoc = await libraryRef.get();
    if (!libDoc.exists) {
        return { success: true, message: "Story already removed from library" };
    }

    // Also get the main story doc to check ownership
    const storyRef = db.collection("stories").doc(storyId);
    const storyDoc = await storyRef.get();

    const batch = db.batch();

    // 1. Remove from user's library
    batch.delete(libraryRef);

    // 2. If user owns the story, delete the main story doc + audio file
    if (storyDoc.exists && storyDoc.data()?.ownerUid === uid) {
        batch.delete(storyRef);

        // Delete from Storage
        const audioPath = storyDoc.data()?.audioPath;
        if (audioPath) {
            // We don't await this in the transaction/batch, just fire & forget or await separately
            // Using a try-catch for storage deletion so it doesn't fail the whole operation if file is missing
            try {
                await storage.bucket().file(audioPath).delete();
            } catch (e) {
                console.warn(`Failed to delete audio ${audioPath}:`, e);
            }
        }
    }

    await batch.commit();
    return { success: true };
});
