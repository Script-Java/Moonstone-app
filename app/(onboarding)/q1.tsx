import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useOnboarding } from "@/components/OnboardingStore";
import { TopBar, SectionLabel, BigTitle, OptionCard, PrimaryCTA } from "@/components/SurveyUI";

export default function Q1() {
    const { survey, setAnswer } = useOnboarding();
    const [selected, setSelected] = useState(survey.q1 ?? "");

    const pick = (v: string) => {
        setSelected(v);
        setAnswer("q1", v);
    };

    return (
        <Screen>
            <TopBar
                onBack={() => router.back()}
                onSkip={() => router.push("/(onboarding)/auth")}
                step={1}
                total={4}
                variant="dots"
            />

            <View className="flex-1 px-6 pt-8">
                <SectionLabel>YOUR QUIET HOUR</SectionLabel>
                <BigTitle>{"As you settle in, how does\nyour heart feel?"}</BigTitle>

                <View className="mt-10 gap-4">
                    <OptionCard icon="leaf-outline" title="Peaceful and content" selected={selected === "Peaceful"} onPress={() => pick("Peaceful")} />
                    <OptionCard icon="layers-outline" title="A little busy, seeking calm" selected={selected === "Busy"} onPress={() => pick("Busy")} />
                    <OptionCard icon="heart-outline" title="Longing for connection" selected={selected === "Connection"} onPress={() => pick("Connection")} />
                    <OptionCard icon="sparkles-outline" title="Ready for gentle wonder" selected={selected === "Wonder"} onPress={() => pick("Wonder")} />
                </View>

                <PrimaryCTA onPress={() => router.push("/(onboarding)/q2")} />
            </View>
        </Screen>
    );
}
