import React, { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useOnboarding } from "@/components/OnboardingStore";
import { TopBar, SectionLabel, BigTitle, OptionCard, PrimaryCTA } from "@/components/SurveyUI";

export default function Q4() {
    const { survey, setAnswer } = useOnboarding();
    const [selected, setSelected] = useState(survey.q4 ?? "");

    const pick = (v: string) => {
        setSelected(v);
        setAnswer("q4", v);
    };

    return (
        <Screen>
            <TopBar
                onBack={() => router.back()}
                onSkip={() => router.push("/(onboarding)/auth")}
                step={4}
                total={4}
                variant="bars"
            />

            <View className="flex-1 px-6 pt-8">
                <SectionLabel>SHARED DREAMS</SectionLabel>
                <BigTitle>{"Who will share this\ntranquil space with you?"}</BigTitle>

                <View className="mt-10 gap-4">
                    <OptionCard
                        icon="moon-outline"
                        title="Just for me, tonight"
                        subtitle="A moment of solitude"
                        selected={selected === "Solo"}
                        onPress={() => pick("Solo")}
                    />
                    <OptionCard
                        icon="heart-outline"
                        title="With my beloved partner"
                        subtitle="Sync your sleep journey"
                        selected={selected === "Partner"}
                        onPress={() => pick("Partner")}
                    />
                    <OptionCard
                        icon="star-outline"
                        title="Sometimes with a loved one"
                        subtitle="We'll ask before each story"
                        selected={selected === "Sometimes"}
                        onPress={() => pick("Sometimes")}
                    />
                </View>

                <PrimaryCTA title="Continue" onPress={() => router.replace("/(onboarding)/auth")} />
            </View>
        </Screen>
    );
}
