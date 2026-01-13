import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
    admin.initializeApp(); // uses your Firebase project config automatically
}

export const db = admin.firestore();
export const storage = admin.storage();
export { admin };
