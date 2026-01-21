import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

export interface PreferenceOption {
    value: string;
    label: string;
    description?: string;
}

interface PreferenceModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    icon: any;
    options: PreferenceOption[];
    selectedValue: string;
    onSelect: (value: string) => void;
}

export default function PreferenceModal({
    visible,
    onClose,
    title,
    icon,
    options,
    selectedValue,
    onSelect,
}: PreferenceModalProps) {
    // removed useTheme()
    const handleSelect = (value: string) => {
        onSelect(value);
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
            {/* Backdrop */}
            <Pressable
                onPress={onClose}
                className="flex-1 bg-black/70"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
            >
                {/* Modal Content */}
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className="flex-1 justify-end"
                    importantForAccessibility="yes"
                >
                    <View
                        className="rounded-t-[32px] overflow-hidden"
                        style={{
                            backgroundColor: COLORS.background,
                            maxHeight: "75%",
                        }}
                    >
                        {/* Gradient border effect at top */}
                        <View
                            className="h-1 w-full"
                            style={{
                                backgroundColor: COLORS.primary,
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
                                <Ionicons name={icon} size={18} color={COLORS.primary} />
                                <Text className="text-white text-xl font-extrabold">{title}</Text>
                            </View>

                            <View className="h-10 w-10" />
                        </View>

                        {/* Content */}
                        <ScrollView
                            className="px-6 py-6"
                            contentContainerStyle={{ paddingBottom: 30 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {options.map((option) => {
                                const active = selectedValue === option.value;
                                return (
                                    <Pressable
                                        key={option.value}
                                        onPress={() => handleSelect(option.value)}
                                        className={[
                                            "rounded-2xl border overflow-hidden mb-3",
                                            active ? "border-primary/60 bg-primary/20" : "border-white/10 bg-white/5",
                                        ].join(" ")}
                                    >
                                        <View className="p-4">
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1">
                                                    <Text
                                                        className={[
                                                            "text-lg font-extrabold mb-1",
                                                            active ? "text-white" : "text-white/70",
                                                        ].join(" ")}
                                                    >
                                                        {option.label}
                                                    </Text>
                                                    {option.description && (
                                                        <Text className="text-white/45 font-semibold text-sm">
                                                            {option.description}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View
                                                    className={[
                                                        "h-6 w-6 rounded-full border-2 items-center justify-center ml-3",
                                                        active ? "border-primary bg-primary" : "border-white/30",
                                                    ].join(" ")}
                                                >
                                                    {active && <Ionicons name="checkmark" size={14} color={COLORS.onPrimary} />}
                                                </View>
                                            </View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
