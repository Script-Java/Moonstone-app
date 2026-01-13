import React, { createContext, useContext, useEffect, useState } from "react";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { firebaseConfig } from "@/constants/firebaseConfig";

interface FirebaseContextType {
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    functions: Functions | null;
    user: User | null;
    isLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
    app: null,
    auth: null,
    db: null,
    functions: null,
    user: null,
    isLoading: true,
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    // Lazy init refs
    const [app, setApp] = useState<FirebaseApp | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [functions, setFunctions] = useState<Functions | null>(null);

    useEffect(() => {
        // DEV MODE: Allow init even with placeholder
        if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn("Using placeholder Firebase Config (Dev Mode)");
        }

        try {
            const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
            const firebaseAuth = getAuth(firebaseApp);
            const firebaseDb = getFirestore(firebaseApp);
            const firebaseFunctions = getFunctions(firebaseApp, "us-central1");

            setApp(firebaseApp);
            setAuth(firebaseAuth);
            setDb(firebaseDb);
            setFunctions(firebaseFunctions);
            setInitialized(true);

            const unsubscribe = onAuthStateChanged(firebaseAuth, (u) => {
                setUser(u);
                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase init failed:", e);
            setIsLoading(false);
        }
    }, []);

    return (
        <FirebaseContext.Provider value={{ app, auth, db, functions, user, isLoading }}>
            {children}
        </FirebaseContext.Provider>
    );
}
