import React, { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useOnboarding } from "@/components/OnboardingStore";
import { TopBar, BigTitle, SubText, OptionCard, PrimaryCTA } from "@/components/SurveyUI";

export default function Q3() {
    const { survey, setAnswer } = useOnboarding();
    const [selected, setSelected] = useState(survey.q3 ?? "");

    const pick = (v: string) => {
        setSelected(v);
        setAnswer("q3", v);
    };

    return (
        <Screen>
            <TopBar
                onBack={() => router.back()}
                onSkip={() => router.push("/(onboarding)/auth")}
                step={3}
                total={4}
                variant="dots"
            />

            <View className="flex-1 px-6 pt-10">
                <BigTitle>When Stars Appear</BigTitle>
                <SubText>When does this tranquil moment usually begin for you?</SubText>

                <View className="mt-10 gap-4">
                    <OptionCard title="As I first lie down" selected={selected === "LieDown"} onPress={() => pick("LieDown")} rightStyle="radio" />
                    <OptionCard title="Just before I close my eyes" selected={selected === "CloseEyes"} onPress={() => pick("CloseEyes")} rightStyle="check" />
                    <OptionCard title="If I awaken in the night" selected={selected === "Awaken"} onPress={() => pick("Awaken")} rightStyle="radio" />
                    <OptionCard title="Anytime I need a gentle pause" selected={selected === "Pause"} onPress={() => pick("Pause")} rightStyle="radio" />
                </View>

                <PrimaryCTA onPress={() => router.push("/(onboarding)/q4")} />
            </View>
        </Screen>
    );
}
