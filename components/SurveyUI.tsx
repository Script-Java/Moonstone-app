import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function TopBar({
    onBack,
    onSkip,
    step,
    total,
    variant = "dots",
}: {
    onBack?: () => void;
    onSkip?: () => void;
    step: number;   // 1-based
    total: number;
    variant?: "dots" | "bars";
}) {
    return (
        <View className="px-6 pt-6">
            <View className="flex-row items-center justify-between">
                <Pressable
                    onPress={onBack}
                    className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
                >
                    <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
                </Pressable>

                {variant === "dots" ? <Dots step={step} total={total} /> : <Bars step={step} total={total} />}

                <Pressable onPress={onSkip} className="px-2 py-2">
                    <Text className="text-white/60 font-semibold text-base">Skip</Text>
                </Pressable>
            </View>
        </View>
    );
}

export function SectionLabel({ children }: { children: string }) {
    return <Text className="text-white/55 font-extrabold tracking-[3px] text-xs text-center">{children}</Text>;
}

export function BigTitle({ children }: { children: string }) {
    return <Text className="text-white text-5xl leading-[52px] font-extrabold text-center mt-5">{children}</Text>;
}

export function SubText({ children }: { children: string }) {
    return <Text className="text-white/45 text-center mt-4 text-lg leading-7">{children}</Text>;
}

export function OptionCard({
    icon,
    title,
    subtitle,
    selected,
    onPress,
    rightStyle = "radio",
}: {
    icon?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    selected?: boolean;
    onPress?: () => void;
    rightStyle?: "radio" | "check";
}) {
    return (
        <Pressable
            onPress={onPress}
            className={[
                "rounded-3xl border px-5 py-5 flex-row items-center justify-between",
                selected ? "border-[#8e2de2] bg-[#8e2de2]/15" : "border-white/10 bg-white/5",
            ].join(" ")}
        >
            <View className="flex-row items-center gap-4 flex-1">
                {icon ? (
                    <View className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center">
                        <Ionicons name={icon} size={22} color={selected ? "#caa6ff" : "rgba(255,255,255,0.45)"} />
                    </View>
                ) : (
                    <View className="h-6 w-6 rounded-full border border-white/25" />
                )}

                <View className="flex-1">
                    <Text className="text-white font-extrabold text-xl">{title}</Text>
                    {subtitle ? <Text className="text-white/35 mt-1 font-semibold">{subtitle}</Text> : null}
                </View>
            </View>

            {rightStyle === "radio" ? (
                <View className={["h-6 w-6 rounded-full border items-center justify-center", selected ? "border-[#8e2de2] bg-[#8e2de2]/40" : "border-white/20"].join(" ")}>
                    {selected ? <View className="h-3 w-3 rounded-full bg-white" /> : null}
                </View>
            ) : (
                <View className={["h-9 w-9 rounded-full items-center justify-center", selected ? "bg-white/90" : "bg-white/8"].join(" ")}>
                    {selected ? <Ionicons name="checkmark" size={18} color="#2A0F45" /> : null}
                </View>
            )}
        </Pressable>
    );
}

export function PrimaryCTA({
    title = "Continue",
    onPress,
}: {
    title?: string;
    onPress?: () => void;
}) {
    return (
        <Pressable onPress={onPress} className="mt-8 rounded-full overflow-hidden">
            <View className="bg-[#7311d4] py-5 items-center rounded-full">
                <Text className="text-white font-extrabold text-2xl">{title}  →</Text>
            </View>
        </Pressable>
    );
}

function Dots({ step, total }: { step: number; total: number }) {
    return (
        <View className="flex-row items-center gap-2">
            {Array.from({ length: total }).map((_, i) => {
                const active = i + 1 === step;
                return <View key={i} className={["h-2.5 w-2.5 rounded-full", active ? "bg-[#8e2de2]" : "bg-white/20"].join(" ")} />;
            })}
        </View>
    );
}

function Bars({ step, total }: { step: number; total: number }) {
    return (
        <View className="flex-row items-center gap-3">
            {Array.from({ length: total }).map((_, i) => {
                const active = i + 1 <= step;
                return (
                    <View
                        key={i}
                        className={[
                            "h-2 rounded-full border border-white/10",
                            i === 0 ? "w-24" : "w-24",
                            active ? "bg-[#8e2de2]" : "bg-white/10",
                        ].join(" ")}
                    />
                );
            })}
        </View>
    );
}
