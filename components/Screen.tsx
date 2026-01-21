import { COLORS } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen({ children }: { children: React.ReactNode }) {
    return (
        <LinearGradient
            colors={[COLORS.background2, COLORS.background]}
            style={{ flex: 1 }}
        >
            <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
        </LinearGradient>
    );
}
