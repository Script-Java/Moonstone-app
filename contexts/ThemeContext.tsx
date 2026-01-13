import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useFirebase } from "@/components/FirebaseStore";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export type ThemeType = "purple" | "dark" | "light";

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
        primary2: "#8e2de2",
        border: "rgba(255,255,255,0.10)",
        good: "#34d399",
        danger: "#fb7185",
    },
    dark: {
        background: "#0a0a0f",
        background2: "#15151a",
        surface: "rgba(255,255,255,0.04)",
        surface2: "rgba(255,255,255,0.06)",
        text: "#ffffff",
        textMuted: "rgba(255,255,255,0.65)",
        textFaint: "rgba(255,255,255,0.40)",
        primary: "#6b7280",
        primary2: "#9ca3af",
        border: "rgba(255,255,255,0.08)",
        good: "#34d399",
        danger: "#fb7185",
    },
    light: {
        background: "#ffffff",
        background2: "#f9fafb",
        surface: "rgba(0,0,0,0.04)",
        surface2: "rgba(0,0,0,0.06)",
        text: "#111827",
        textMuted: "rgba(0,0,0,0.60)",
        textFaint: "rgba(0,0,0,0.40)",
        primary: "#7c3aed",
        primary2: "#8b5cf6",
        border: "rgba(0,0,0,0.10)",
        good: "#059669",
        danger: "#e11d48",
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

        const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
            const data = doc.data();
            const userTheme = data?.theme || "purple";
            setThemeState(userTheme);
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

    const colors = THEME_CONFIG[theme];

    return (
        <ThemeContext.Provider value={{ theme, colors, setTheme }}>
            {children}
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
