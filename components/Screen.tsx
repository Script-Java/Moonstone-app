import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Screen({ children }: { children: React.ReactNode }) {
    return (
        <LinearGradient
            colors={["#191022", "#120b18"]}
            style={{ flex: 1 }}
        >
            <View className="flex-1">{children}</View>
        </LinearGradient>
    );
}
