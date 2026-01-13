import React from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SupportModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    icon: any;
    content: React.ReactNode;
}

export default function SupportModal({
    visible,
    onClose,
    title,
    icon,
    content,
}: SupportModalProps) {
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
                            backgroundColor: "#0a0a0f",
                            maxHeight: "85%",
                        }}
                    >
                        {/* Gradient border effect at top */}
                        <View
                            className="h-1 w-full"
                            style={{
                                backgroundColor: "#8e2de2",
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
                                <Ionicons name={icon} size={18} color="#8e2de2" />
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
                            {content}
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
