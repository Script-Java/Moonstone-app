import Constants from 'expo-constants';

// Firebase Configuration - Using environment variables for security
const extra = Constants.expoConfig?.extra || {};

export const firebaseConfig = {
    apiKey: extra.firebaseApiKey || process.env.FIREBASE_API_KEY || "",
    authDomain: extra.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: extra.firebaseProjectId || process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: extra.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: extra.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: extra.firebaseAppId || process.env.FIREBASE_APP_ID || "",
    measurementId: extra.firebaseMeasurementId || process.env.FIREBASE_MEASUREMENT_ID || ""
};

// Validate config
export function validateFirebaseConfig(): boolean {
    return !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId);
}
