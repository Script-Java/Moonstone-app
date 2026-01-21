import { useFirebase } from "@/components/FirebaseStore";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { getDownloadURL, getStorage, ref } from "firebase/storage";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

// Voice pack configuration (must match backend)
export const VOICE_PACK = {
    kore: {
        name: "Kore",
        accent: "American",
        gender: "female",
        icon: "rose-outline" as const,
        description: "Warm, friendly",
    },
    puck: {
        name: "Puck",
        accent: "American",
        gender: "male",
        icon: "moon-outline" as const,
        description: "Young, energetic",
    },
    charon: {
        name: "Charon",
        accent: "American",
        gender: "male",
        icon: "book-outline" as const,
        description: "Mature, authoritative",
    },
    fenrir: {
        name: "Fenrir",
        accent: "American",
        gender: "male",
        icon: "planet-outline" as const,
        description: "Deep, resonant",
    },
    aoede: {
        name: "Aoede",
        accent: "American",
        gender: "female",
        icon: "musical-notes-outline" as const,
        description: "Melodic, soothing",
    },
} as const;

export type VoiceKey = keyof typeof VOICE_PACK;

// Pre-generated preview MP3s in Firebase Storage
const PREVIEW_PATHS: Record<VoiceKey, string> = {
    kore: "previews/kore.mp3",
    puck: "previews/puck.mp3",
    charon: "previews/charon.mp3",
    fenrir: "previews/fenrir.mp3",
    aoede: "previews/aoede.mp3",
};

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
    const [shouldPlayPreview, setShouldPlayPreview] = useState(false);

    // Cache preview URLs by voiceKey
    const [urlCache, setUrlCache] = useState<Record<string, string>>({});

    // Player (expo-audio)
    const source = useMemo(() => (previewUrl ? { uri: previewUrl } : null), [previewUrl]);
    const audioPlayer = useAudioPlayer(source);
    const audioStatus = useAudioPlayerStatus(audioPlayer);

    // Debug logs
    useEffect(() => {
        console.log("🎧 previewUrl changed:", previewUrl);
    }, [previewUrl]);

    useEffect(() => {
        console.log("🎧 audio status:", {
            playing: audioStatus.playing,
            buffering: audioStatus.isBuffering,
            duration: audioStatus.duration,
            currentTime: audioStatus.currentTime,
        });
    }, [audioStatus.playing, audioStatus.isBuffering, audioStatus.duration, audioStatus.currentTime]);

    // Auto-play when player is ready (triggered by user click via shouldPlayPreview)
    useEffect(() => {
        if (!audioPlayer) return;
        if (!previewUrl) return;
        if (!shouldPlayPreview) return;

        try {
            audioPlayer.play();
        } catch (e) {
            console.warn("Could not auto-play preview:", e);
        } finally {
            // Consume the click intent
            setShouldPlayPreview(false);
        }
    }, [audioPlayer, previewUrl, shouldPlayPreview]);



    // When playback ends, clear "previewing"
    useEffect(() => {
        // Guard: must have been playing and now stopped
        if (!audioPlayer) return;

        const finished =
            !audioStatus.playing &&
            (audioStatus.currentTime ?? 0) > 0 &&
            (audioStatus.duration ?? 0) > 0 &&
            (audioStatus.currentTime ?? 0) >= (audioStatus.duration ?? 0) - 0.1;

        if (finished) {
            setPreviewingVoice(null);
            setPreviewUrl(null);
        }
    }, [audioStatus.playing, audioStatus.currentTime, audioStatus.duration, audioPlayer]);

    // Stop preview helper
    const stopPreview = () => {
        try {
            audioPlayer?.pause?.();
        } catch { }
        setShouldPlayPreview(false);
        setPreviewUrl(null);
        setPreviewingVoice(null);
    };

    const handlePreview = async (voiceKey: VoiceKey) => {
        if (previewingVoice === voiceKey) {
            stopPreview();
            return;
        }

        try {
            stopPreview();
            setPreviewingVoice(voiceKey);

            let url = urlCache[voiceKey];

            if (!url) {
                const path = PREVIEW_PATHS[voiceKey];
                if (!path) throw new Error(`Missing preview path for voice: ${voiceKey}`);
                if (!app) throw new Error("Firebase app not ready");

                const storage = getStorage(app);
                const fileRef = ref(storage, path);
                url = await getDownloadURL(fileRef);
                setUrlCache((prev) => ({ ...prev, [voiceKey]: url }));
            }

            // Set URL and flag to play (effect will handle actual playback)
            setShouldPlayPreview(true);
            setPreviewUrl(url);
        } catch (error: any) {
            console.error("Failed to preview voice:", error);
            Alert.alert("Preview failed", error?.message || "Could not load preview audio");
            setPreviewingVoice(null);
            setPreviewUrl(null);
            setShouldPlayPreview(false);
        }
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
                        const isActive = previewingVoice === voiceKey;
                        const isBusy = previewingVoice !== null && !isActive; // prevent multiple parallel previews

                        const icon =
                            voice.icon; // already typed as const

                        return (
                            <View
                                key={voiceKey}
                                className={[
                                    "rounded-2xl border p-4",
                                    isSelected ? "border-primary bg-primary" : "border-border bg-surface",
                                ].join(" ")}
                                style={{
                                    backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                                    borderColor: isSelected ? COLORS.primary : COLORS.border
                                }}
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
                                                name={icon}
                                                size={24}
                                                color={isSelected ? COLORS.onPrimary : "rgba(255,255,255,0.5)"}
                                            />
                                        </View>

                                        <View className="flex-1">
                                            <Text
                                                className={[
                                                    "font-extrabold text-base",
                                                ].join(" ")}
                                                style={{ color: isSelected ? COLORS.onPrimary : "#ffffff" }}
                                            >
                                                {voice.name}
                                            </Text>
                                            <Text className="text-xs font-semibold mt-0.5" style={{ color: isSelected ? COLORS.onPrimary : "rgba(255,255,255,0.6)" }}>
                                                {voice.description}
                                            </Text>
                                        </View>
                                    </Pressable>

                                    {/* Preview Button */}
                                    <Pressable
                                        onPress={() => handlePreview(voiceKey)}
                                        className={[
                                            "px-4 py-2 rounded-full border",
                                            isActive ? "border-primary bg-primary/20" : "border-border bg-surface",
                                            isBusy ? "opacity-60" : "",
                                        ].join(" ")}
                                        disabled={isBusy}
                                    >
                                        {isActive ? (
                                            <View className="flex-row items-center gap-2">
                                                {audioStatus.isBuffering ? (
                                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                                ) : (
                                                    <Ionicons name="stop" size={14} color={COLORS.primary} />
                                                )}
                                                <Text className="text-primary2 font-extrabold text-xs">
                                                    {audioStatus.isBuffering ? "Loading" : audioStatus.playing ? "Playing" : "Stop"}
                                                </Text>
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
                                            <Ionicons name="checkmark-circle" size={16} color={COLORS.onPrimary} />
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
                        <Ionicons name="save-outline" size={18} color={COLORS.primary} />
                        <Text className="text-primary2 font-extrabold">Set as Default Voice</Text>
                    </Pressable>
                )}
            </ScrollView>
        </View>
    );
}
