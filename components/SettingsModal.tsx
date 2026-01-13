import React from "react";
import { View, Text, Pressable, Modal, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import VoiceSelector, { VoiceKey } from "@/components/VoiceSelector";

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
                            backgroundColor: '#0a0a0f',
                            maxHeight: '85%',
                        }}
                    >
                        {/* Gradient border effect at top */}
                        <View
                            className="h-1 w-full"
                            style={{
                                backgroundColor: '#8e2de2',
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
                                <Ionicons name="settings-sharp" size={18} color="#8e2de2" />
                                <Text className="text-white text-xl font-extrabold">Story Settings</Text>
                            </View>

                            <Pressable
                                onPress={handleSave}
                                className="px-5 py-2.5 rounded-full active:opacity-80"
                                style={{
                                    backgroundColor: '#8e2de2',
                                }}
                            >
                                <Text className="text-white font-extrabold text-sm">Save</Text>
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
                                    <Ionicons name="time-outline" size={16} color="#8e2de2" />
                                    <Text className="text-primary font-extrabold tracking-widest text-xs">STORY LENGTH</Text>
                                </View>

                                {storyLengths.map((length, index) => {
                                    const active = localSettings.storyLength === length.key;
                                    return (
                                        <Pressable
                                            key={length.key}
                                            onPress={() => setLocalSettings({ ...localSettings, storyLength: length.key })}
                                            className={[
                                                "rounded-2xl border overflow-hidden mb-3",
                                                active ? "border-primary/60" : "border-white/10",
                                            ].join(" ")}
                                            style={{
                                                backgroundColor: active ? 'rgba(142, 45, 226, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                            }}
                                        >
                                            <View className="p-4">
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1">
                                                        <View className="flex-row items-center gap-2 mb-1">
                                                            <Text className={["text-lg font-extrabold", active ? "text-white" : "text-white/70"].join(" ")}>
                                                                {length.label}
                                                            </Text>
                                                            <View className={[
                                                                "px-2.5 py-1 rounded-full",
                                                                active ? "bg-primary/30" : "bg-white/10"
                                                            ].join(" ")}>
                                                                <Text className="text-primary font-extrabold text-xs">{length.duration}</Text>
                                                            </View>
                                                        </View>
                                                        <Text className="text-white/45 font-semibold text-sm">{length.description}</Text>
                                                    </View>
                                                    <View className={[
                                                        "h-6 w-6 rounded-full border-2 items-center justify-center ml-3",
                                                        active ? "border-primary" : "border-white/30"
                                                    ].join(" ")}
                                                        style={active ? { backgroundColor: '#8e2de2' } : {}}
                                                    >
                                                        {active && <Ionicons name="checkmark" size={14} color="white" />}
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
                                    <Ionicons name="mic-outline" size={16} color="#8e2de2" />
                                    <Text className="text-primary font-extrabold tracking-widest text-xs">NARRATION VOICE</Text>
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
                                        <Ionicons name="moon" size={16} color="#8e2de2" />
                                        <Text className="text-primary font-extrabold tracking-widest text-xs">GOOD NIGHT MESSAGE</Text>
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
                <View style={{ flex: 1, backgroundColor: '#0a0a0f' }}>
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
