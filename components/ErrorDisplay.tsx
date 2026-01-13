import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface ErrorDisplayProps {
    message: string;
    onDismiss: () => void;
    autoHideDuration?: number;
}

export default function ErrorDisplay({ message, onDismiss, autoHideDuration = 5000 }: ErrorDisplayProps) {
    useEffect(() => {
        if (autoHideDuration > 0) {
            const timer = setTimeout(onDismiss, autoHideDuration);
            return () => clearTimeout(timer);
        }
    }, [autoHideDuration, onDismiss]);

    return (
        <Animated.View
            entering={FadeInDown.springify().damping(15)}
            exiting={FadeOutUp.springify().damping(15)}
            className="absolute top-5 left-5 right-5 z-50"
        >
            <View className="rounded-2xl border border-red-500/50 bg-red-950/95 p-4 shadow-2xl">
                <View className="flex-row items-start gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                        <Ionicons name="alert-circle" size={24} color="#ef4444" />
                    </View>

                    <View className="flex-1">
                        <Text className="text-white font-extrabold text-base mb-1">Something went wrong</Text>
                        <Text className="text-red-200/90 font-medium text-sm leading-5">{message}</Text>
                    </View>

                    <Pressable onPress={onDismiss} className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                        <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
                    </Pressable>
                </View>

                {/* Progress bar for auto-dismiss */}
                {autoHideDuration > 0 && (
                    <View className="mt-3 h-1 rounded-full bg-red-500/20 overflow-hidden">
                        <Animated.View
                            className="h-full bg-red-500"
                            style={{
                                width: "100%",
                            }}
                        />
                    </View>
                )}
            </View>
        </Animated.View>
    );
}
