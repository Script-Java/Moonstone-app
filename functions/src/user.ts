import * as functions from "firebase-functions/v1";
import { db } from "./firebase";

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    const userRef = db.collection("users").doc(user.uid);

    // Give 3 free credits to every new user
    await userRef.set({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        credits: 3,
        createdAt: new Date(),
        isPremium: false
    });

    console.log(`Created profile for user ${user.uid} with 3 credits.`);
});
