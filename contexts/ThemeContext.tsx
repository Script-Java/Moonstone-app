import { useFirebase } from "@/components/FirebaseStore";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { vars } from "nativewind";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { View } from "react-native";

export type ThemeType = "purple" | "midnight" | "obsidian" | "slate";

export interface ThemeColors {
    // Background colors
    background: string;
    background2: string;
    surface: string;
    surface2: string;

    // Text colors
    text: string;
    textMuted: string;
    textFaint: string;

    // Accent colors
    primary: string;
    onPrimary: string;
    primary2: string;
    border: string;

    // Status colors
    good: string;
    danger: string;
}

const THEME_CONFIG: Record<ThemeType, ThemeColors> = {
    purple: {
        background: "#120b18",
        background2: "#191022",
        surface: "rgba(255,255,255,0.06)",
        surface2: "rgba(255,255,255,0.08)",
        text: "#ffffff",
        textMuted: "rgba(255,255,255,0.60)",
        textFaint: "rgba(255,255,255,0.35)",
        primary: "#7311d4",
        onPrimary: "#ffffff",
        primary2: "#8e2de2",
        border: "rgba(255,255,255,0.10)",
        good: "#34d399",
        danger: "#fb7185",
    },
    midnight: {
        background: "#0a0e1a",
        background2: "#111827",
        surface: "rgba(59,130,246,0.08)",
        surface2: "rgba(59,130,246,0.12)",
        text: "#ffffff",
        textMuted: "rgba(255,255,255,0.65)",
        textFaint: "rgba(255,255,255,0.40)",
        primary: "#3b82f6",
        onPrimary: "#ffffff",
        primary2: "#60a5fa",
        border: "rgba(59,130,246,0.15)",
        good: "#34d399",
        danger: "#fb7185",
    },
    obsidian: {
        background: "#000000",
        background2: "#0a0a0a",
        surface: "rgba(255,255,255,0.04)",
        surface2: "rgba(255,255,255,0.06)",
        text: "#ffffff",
        textMuted: "rgba(255,255,255,0.70)",
        textFaint: "rgba(255,255,255,0.45)",
        primary: "#ffffff",
        onPrimary: "#000000",
        primary2: "#e5e5e5",
        border: "rgba(255,255,255,0.08)",
        good: "#10b981",
        danger: "#ef4444",
    },
    slate: {
        background: "#0f1419",
        background2: "#1a1f2e",
        surface: "rgba(148,163,184,0.08)",
        surface2: "rgba(148,163,184,0.12)",
        text: "#f1f5f9",
        textMuted: "rgba(241,245,249,0.65)",
        textFaint: "rgba(241,245,249,0.40)",
        primary: "#94a3b8",
        onPrimary: "#ffffff",
        primary2: "#cbd5e1",
        border: "rgba(148,163,184,0.15)",
        good: "#22c55e",
        danger: "#f87171",
    },
};

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user, db } = useFirebase();
    const [theme, setThemeState] = useState<ThemeType>("purple");

    // Load theme preference from Firestore
    useEffect(() => {
        if (!user || !db) return;

        const unsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
            const data = snapshot.data();
            let userTheme = data?.theme || "purple";

            // Validate theme exists, fallback to purple for old/invalid themes
            if (!THEME_CONFIG[userTheme as ThemeType]) {
                console.warn(`Invalid theme '${userTheme}' detected. Falling back to 'purple'.`);
                userTheme = "purple";

                // Update Firestore to fix invalid theme
                updateDoc(doc(db, "users", user.uid), { theme: "purple" }).catch(console.error);
            }

            setThemeState(userTheme as ThemeType);
        });

        return () => unsub();
    }, [user, db]);

    // Update theme in Firestore
    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);

        if (!user || !db) return;

        try {
            await updateDoc(doc(db, "users", user.uid), {
                theme: newTheme,
            });
        } catch (error) {
            console.error("Error updating theme:", error);
        }
    };

    const colors = THEME_CONFIG[theme] || THEME_CONFIG.purple;

    const themeVars = {
        "--color-primary": colors.primary,
        "--color-on-primary": colors.onPrimary,
        "--color-primary2": colors.primary2,
    };

    return (
        <ThemeContext.Provider value={{ theme, colors, setTheme }}>
            <View style={vars(themeVars)} className="flex-1">
                {children}
            </View>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
