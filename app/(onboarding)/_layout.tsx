import React from "react";
import { Stack } from "expo-router";
import { OnboardingProvider } from "@/components/OnboardingStore";

export default function OnboardingLayout() {
    return (
        <OnboardingProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </OnboardingProvider>
    );
}
