import { useTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View } from "react-native";

export default function Screen({ children }: { children: React.ReactNode }) {
    const { colors } = useTheme();

    return (
        <LinearGradient
            colors={[colors.background2, colors.background]}
            style={{ flex: 1 }}
        >
            <View className="flex-1">{children}</View>
        </LinearGradient>
    );
}
