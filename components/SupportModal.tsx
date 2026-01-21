import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

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
    // removed useTheme()
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
                        className="rounded-t-[32px] overflow-hidden flex-1"
                        style={{
                            backgroundColor: COLORS.background,
                            maxHeight: "85%",
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
                            className="flex-1"
                            contentContainerStyle={{
                                paddingHorizontal: 24,
                                paddingTop: 24,
                                paddingBottom: 60
                            }}
                            showsVerticalScrollIndicator={true}
                            bounces={true}
                        >
                            {content}
                        </ScrollView>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
