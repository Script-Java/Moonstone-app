import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";
import { useOnboarding } from "@/components/OnboardingStore";
import { TopBar, SectionLabel, BigTitle, OptionCard, PrimaryCTA } from "@/components/SurveyUI";

export default function Q2() {
  const { survey, setAnswer } = useOnboarding();
  const [selected, setSelected] = useState(survey.q2 ?? "");

  const pick = (v: string) => {
    setSelected(v);
    setAnswer("q2", v);
  };

  return (
    <Screen>
      <TopBar
        onBack={() => router.back()}
        onSkip={() => router.push("/(onboarding)/auth")}
        step={2}
        total={4}
        variant="dots"
      />

      <View className="flex-1 px-6 pt-8">
        <SectionLabel>YOUR BEDTIME JOURNEY</SectionLabel>
        <BigTitle>{"What whispers do you\nhope to hear as the day\nfades?"}</BigTitle>

        <View className="mt-10 gap-4">
          <OptionCard title="To drift away gently" selected={selected === "Drift"} onPress={() => pick("Drift")} />
          <OptionCard title="To calm a restless mind" selected={selected === "Calm"} onPress={() => pick("Calm")} />
          <OptionCard title={"To share a moment of\ncloseness"} selected={selected === "Closeness"} onPress={() => pick("Closeness")} />
          <OptionCard title="To find a new nightly rhythm" selected={selected === "Rhythm"} onPress={() => pick("Rhythm")} />
        </View>

        <PrimaryCTA onPress={() => router.push("/(onboarding)/q3")} />
      </View>
    </Screen>
  );
}
