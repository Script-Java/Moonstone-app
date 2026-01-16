import VoiceSelector, { VoiceKey } from "@/components/VoiceSelector";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

export type StoryLength = "short" | "standard" | "long";

export interface StorySettings {
    storyLength: StoryLength;
    voiceKey: VoiceKey;
    goodNightMessage: string;
}

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    settings: StorySettings;
    onUpdateSettings: (settings: StorySettings) => void;
}

const storyLengths: { key: StoryLength; label: string; duration: string; description: string }[] = [
    { key: "short", label: "Short", duration: "~3 min", description: "Quick tale for fast dreams" },
    { key: "standard", label: "Standard", duration: "~5 min", description: "Perfect bedtime length" },
    { key: "long", label: "Long", duration: "~8 min", description: "Extended narrative journey" },
];



export default function SettingsModal({ visible, onClose, settings, onUpdateSettings }: SettingsModalProps) {
    const { colors } = useTheme();
    const [localSettings, setLocalSettings] = React.useState<StorySettings>(settings);
    const [voiceModalVisible, setVoiceModalVisible] = React.useState(false);

    React.useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSave = () => {
        onUpdateSettings(localSettings);
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
            statusBarTranslucent
            accessibilityViewIsModal={true}
        >
            {/* Backdrop with blur effect */}
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/70"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
            >
                {/* Modal Content - Prevent backdrop press from closing when tapping content */}
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className="flex-1 justify-end"
                    importantForAccessibility="yes"
                >
                    <View
                        className="rounded-t-[32px] overflow-hidden"
                        style={{
                            backgroundColor: colors.background,
                            maxHeight: '85%',
                        }}
                    >
                        {/* Gradient border effect at top */}
                        <View
                            className="h-1 w-full"
                            style={{
                                backgroundColor: colors.primary,
                            }}
                        />

                        {/* Header */}
                        <View className="flex-row items-center justify-between px-6 py-5 border-b border-white/10">
                            <Pressable
                                onPress={onClose}
                                className="h-10 w-10 rounded-full items-center justify-center bg-white/5 active:bg-white/10"
                            >
                                <Ionicons name="close" size={22} color="rgba(255,255,255,0.9)" />
                            </Pressable>

                            <View className="flex-row items-center gap-2">
                                <Ionicons name="settings-sharp" size={18} color={colors.primary} />
                                <Text className="text-white text-xl font-extrabold">Story Settings</Text>
                            </View>

                            <Pressable
                                onPress={handleSave}
                                className="px-5 py-2.5 rounded-full active:opacity-80"
                                style={{
                                    backgroundColor: colors.primary,
                                }}
                            >
                                <Text className="font-extrabold text-sm" style={{ color: colors.onPrimary }}>Save</Text>
                            </Pressable>
                        </View>

                        {/* Content */}
                        <ScrollView
                            className="px-6 py-6"
                            contentContainerStyle={{ paddingBottom: 30 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Story Length */}
                            <View className="mb-8">
                                <View className="flex-row items-center gap-2 mb-4">
                                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                                    <Text className="font-extrabold tracking-widest text-xs" style={{ color: colors.text }}>STORY LENGTH</Text>
                                </View>

                                {storyLengths.map((length, index) => {
                                    const active = localSettings.storyLength === length.key;
                                    return (
                                        <Pressable
                                            key={length.key}
                                            onPress={() => setLocalSettings({ ...localSettings, storyLength: length.key })}
                                            className={[
                                                "rounded-2xl border overflow-hidden mb-3",
                                                active ? "border-primary bg-primary" : "border-white/10 bg-white/5",
                                            ].join(" ")}
                                            style={{
                                                backgroundColor: active ? colors.primary : "rgba(255, 255, 255, 0.05)",
                                                borderColor: active ? colors.primary : "rgba(255, 255, 255, 0.1)"
                                            }}
                                        >
                                            <View className="p-4">
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1">
                                                        <View className="flex-row items-center gap-2 mb-1">
                                                            <Text className={["text-lg font-extrabold"].join(" ")} style={{ color: active ? colors.onPrimary : "rgba(255,255,255,0.7)" }}>
                                                                {length.label}
                                                            </Text>
                                                            <View className={[
                                                                "px-2.5 py-1 rounded-full",
                                                                active ? "bg-black/20" : "bg-white/10"
                                                            ].join(" ")}>
                                                                <Text className="font-extrabold text-xs" style={{ color: active ? colors.onPrimary : colors.text }}>{length.duration}</Text>
                                                            </View>
                                                        </View>
                                                        <Text className="font-semibold text-sm" style={{ color: active ? colors.onPrimary : "rgba(255,255,255,0.45)" }}>{length.description}</Text>
                                                    </View>
                                                    <View className={[
                                                        "h-6 w-6 rounded-full border-2 items-center justify-center ml-3",
                                                        active ? "border-primary" : "border-white/30"
                                                    ].join(" ")}
                                                        style={active ? { backgroundColor: colors.primary } : {}}
                                                    >
                                                        {active && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
                                                    </View>
                                                </View>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* Narration Voice */}
                            <View className="mb-8">
                                <View className="flex-row items-center gap-2 mb-4">
                                    <Ionicons name="mic-outline" size={16} color={colors.primary} />
                                    <Text className="font-extrabold tracking-widest text-xs" style={{ color: colors.text }}>NARRATION VOICE</Text>
                                </View>

                                <Pressable
                                    onPress={() => setVoiceModalVisible(true)}
                                    className="rounded-2xl border border-white/10 overflow-hidden"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <View className="p-4 flex-row items-center justify-between">
                                        <View className="flex-1">
                                            <Text className="text-white font-extrabold text-lg mb-1">
                                                {localSettings.voiceKey ? localSettings.voiceKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Select Voice'}
                                            </Text>
                                            <Text className="text-white/45 font-semibold text-sm">Tap to preview voices</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.35)" />
                                    </View>
                                </Pressable>
                            </View>

                            {/* Good Night Message */}
                            <View>
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-row items-center gap-2">
                                        <Ionicons name="moon" size={16} color={colors.primary} />
                                        <Text className="font-extrabold tracking-widest text-xs" style={{ color: colors.text }}>GOOD NIGHT MESSAGE</Text>
                                    </View>
                                    <Text className="text-primary/60 font-bold text-xs">{localSettings.goodNightMessage.length}/100</Text>
                                </View>

                                <View
                                    className="rounded-2xl border border-white/10 overflow-hidden"
                                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                >
                                    <View className="p-4">
                                        <TextInput
                                            value={localSettings.goodNightMessage}
                                            onChangeText={(text) => setLocalSettings({ ...localSettings, goodNightMessage: text.slice(0, 100) })}
                                            placeholder="Sweet dreams, my love..."
                                            placeholderTextColor="rgba(255,255,255,0.25)"
                                            className="text-white font-semibold text-base"
                                            multiline
                                            numberOfLines={3}
                                            style={{ minHeight: 80 }}
                                        />
                                    </View>
                                </View>

                                <View className="flex-row items-center gap-2 mt-3">
                                    <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.3)" />
                                    <Text className="text-white/30 text-xs font-medium flex-1">
                                        This message will be whispered at the end of your story
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>

            {/* Voice Selector Modal */}
            <Modal
                visible={voiceModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setVoiceModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
                        <Pressable
                            onPress={() => setVoiceModalVisible(false)}
                            className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
                        >
                            <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
                        </Pressable>
                        <Text className="text-white text-xl font-extrabold">Select Voice</Text>
                        <View className="h-11 w-11" />
                    </View>
                    <VoiceSelector
                        selectedVoice={localSettings.voiceKey}
                        onSelectVoice={(voiceKey) => {
                            setLocalSettings({ ...localSettings, voiceKey });
                            setVoiceModalVisible(false);
                        }}
                    />
                </View>
            </Modal>
        </Modal>
    );
}
