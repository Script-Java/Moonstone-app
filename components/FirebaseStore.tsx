import { firebaseConfig } from "@/constants/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import {
    Auth,
    getAuth,
    getReactNativePersistence,
    initializeAuth,
    onAuthStateChanged,
    User
} from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Functions, getFunctions } from "firebase/functions";
import React, { createContext, useContext, useEffect, useState } from "react";

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
    const [app, setApp] = useState<FirebaseApp | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [functions, setFunctions] = useState<Functions | null>(null);

    useEffect(() => {
        try {
            // Initialize App
            const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

            // Correct way to initialize Auth with AsyncStorage in React Native
            let firebaseAuth: Auth;
            if (getApps().length <= 1) {
                try {
                    firebaseAuth = initializeAuth(firebaseApp, {
                        persistence: getReactNativePersistence(AsyncStorage)
                    });
                } catch (e: any) {
                    // Check if error is because it's already initialized
                    if (e.code === 'auth/already-initialized') {
                        firebaseAuth = getAuth(firebaseApp);
                    } else {
                        // For other errors, fallback to getAuth but log
                        console.warn("Auth init error, falling back:", e);
                        firebaseAuth = getAuth(firebaseApp);
                    }
                }
            } else {
                firebaseAuth = getAuth(firebaseApp);
            }

            const firebaseDb = getFirestore(firebaseApp);
            const firebaseFunctions = getFunctions(firebaseApp, "us-central1");

            setApp(firebaseApp);
            setAuth(firebaseAuth);
            setDb(firebaseDb);
            setFunctions(firebaseFunctions);

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
