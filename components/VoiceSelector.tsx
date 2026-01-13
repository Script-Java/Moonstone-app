import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useFirebase } from "@/components/FirebaseStore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

// Voice pack configuration (must match backend)
export const VOICE_PACK = {
    gb_wavenet_d: {
        name: "London Night",
        accent: "British",
        gender: "male",
        icon: "moon-outline" as const,
    },
    gb_wavenet_c: {
        name: "Soft British",
        accent: "British",
        gender: "female",
        icon: "rose-outline" as const,
    },
    us_wavenet_d: {
        name: "American Reader",
        accent: "American",
        gender: "male",
        icon: "book-outline" as const,
    },
    us_wavenet_f: {
        name: "Warm Narrator",
        accent: "American",
        gender: "female",
        icon: "planet-outline" as const,
    },
} as const;

export type VoiceKey = keyof typeof VOICE_PACK;

interface VoiceSelectorProps {
    selectedVoice: VoiceKey;
    onSelectVoice: (voiceKey: VoiceKey) => void;
    showSetAsDefault?: boolean;
    onSetAsDefault?: () => void;
}

export default function VoiceSelector({
    selectedVoice,
    onSelectVoice,
    showSetAsDefault = false,
    onSetAsDefault,
}: VoiceSelectorProps) {
    const { app } = useFirebase();
    const [previewingVoice, setPreviewingVoice] = useState<VoiceKey | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Use expo-audio instead of expo-av
    const audioPlayer = useAudioPlayer(previewUrl ? { uri: previewUrl } : null);

    // Auto-stop when audio finishes
    useEffect(() => {
        if (audioPlayer && !audioPlayer.playing && audioPlayer.currentTime > 0) {
            // Audio finished playing
            setPreviewingVoice(null);
        }
    }, [audioPlayer?.playing, audioPlayer?.currentTime]);

    const handlePreview = async (voiceKey: VoiceKey) => {
        try {
            // Stop any currently playing preview
            if (audioPlayer) {
                audioPlayer.pause();
            }

            setPreviewingVoice(voiceKey);

            // Call Cloud Function to get preview path
            const functions = getFunctions(app!);
            const previewVoiceFunc = httpsCallable<
                { voiceKey: string },
                { previewPath: string; cached: boolean }
            >(functions, "previewVoice");

            const result = await previewVoiceFunc({ voiceKey });
            const { previewPath } = result.data;

            console.log(`🎵 Getting download URL for preview: ${previewPath}`);

            // Get download URL using Firebase Storage SDK
            const storage = getStorage(app!);
            const audioRef = ref(storage, previewPath);
            const url = await getDownloadURL(audioRef);

            console.log(`✅ Playing preview for ${voiceKey}`);

            // Set URL and play
            setPreviewUrl(url);

            // Small delay to ensure player is ready
            setTimeout(() => {
                if (audioPlayer) {
                    audioPlayer.play();
                }
            }, 100);
        } catch (error: any) {
            console.error("Failed to preview voice:", error);
            alert(`Preview failed: ${error.message || "Unknown error"}`);
            setPreviewingVoice(null);
        }
    };

    const stopPreview = () => {
        if (audioPlayer) {
            audioPlayer.pause();
        }
        setPreviewUrl(null);
        setPreviewingVoice(null);
    };

    return (
        <View className="flex-1">
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <Text className="text-white text-2xl font-extrabold mb-2">Choose Your Narrator</Text>
                <Text className="text-muted text-sm font-semibold mb-6">
                    Select a voice that will guide you to sleep
                </Text>

                <View className="gap-3">
                    {(Object.keys(VOICE_PACK) as VoiceKey[]).map((voiceKey) => {
                        const voice = VOICE_PACK[voiceKey];
                        const isSelected = selectedVoice === voiceKey;
                        const isPreviewing = previewingVoice === voiceKey;

                        return (
                            <View
                                key={voiceKey}
                                className={[
                                    "rounded-2xl border p-4",
                                    isSelected ? "border-primary/70 bg-primary/10" : "border-border bg-surface",
                                ].join(" ")}
                            >
                                <View className="flex-row items-center justify-between">
                                    {/* Voice Info */}
                                    <Pressable
                                        onPress={() => onSelectVoice(voiceKey)}
                                        className="flex-1 flex-row items-center gap-3"
                                    >
                                        <View
                                            className={[
                                                "w-12 h-12 rounded-full items-center justify-center",
                                                isSelected ? "bg-primary/20" : "bg-white/5",
                                            ].join(" ")}
                                        >
                                            <Ionicons
                                                name={voice.icon}
                                                size={24}
                                                color={isSelected ? "#8e2de2" : "rgba(255,255,255,0.5)"}
                                            />
                                        </View>

                                        <View className="flex-1">
                                            <Text
                                                className={[
                                                    "font-extrabold text-base",
                                                    isSelected ? "text-primary2" : "text-white",
                                                ].join(" ")}
                                            >
                                                {voice.name}
                                            </Text>
                                            <Text className="text-muted text-xs font-semibold mt-0.5">
                                                {voice.accent} • {voice.gender}
                                            </Text>
                                        </View>
                                    </Pressable>

                                    {/* Preview Button */}
                                    <Pressable
                                        onPress={() => (isPreviewing ? stopPreview() : handlePreview(voiceKey))}
                                        className={[
                                            "px-4 py-2 rounded-full border",
                                            isPreviewing
                                                ? "border-primary bg-primary/20"
                                                : "border-border bg-surface",
                                        ].join(" ")}
                                        disabled={previewingVoice !== null && !isPreviewing}
                                    >
                                        {isPreviewing ? (
                                            <View className="flex-row items-center gap-2">
                                                <ActivityIndicator size="small" color="#8e2de2" />
                                                <Text className="text-primary2 font-extrabold text-xs">Playing</Text>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center gap-1">
                                                <Ionicons name="play" size={14} color="rgba(255,255,255,0.7)" />
                                                <Text className="text-white/70 font-extrabold text-xs">Preview</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                </View>

                                {/* Selection Indicator */}
                                {isSelected && (
                                    <View className="mt-3 pt-3 border-t border-primary/20">
                                        <View className="flex-row items-center gap-2">
                                            <Ionicons name="checkmark-circle" size={16} color="#8e2de2" />
                                            <Text className="text-primary2 font-extrabold text-xs">Selected</Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Set as Default Button (optional) */}
                {showSetAsDefault && onSetAsDefault && (
                    <Pressable
                        onPress={onSetAsDefault}
                        className="mt-6 bg-primary/20 border border-primary/50 rounded-2xl p-4 flex-row items-center justify-center gap-2"
                    >
                        <Ionicons name="save-outline" size={18} color="#8e2de2" />
                        <Text className="text-primary2 font-extrabold">Set as Default Voice</Text>
                    </Pressable>
                )}
            </ScrollView>
        </View>
    );
}
