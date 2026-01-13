import React, { createContext, useContext, useMemo, useState } from "react";

type SurveyState = {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
};

type Ctx = {
    survey: SurveyState;
    setAnswer: (key: keyof SurveyState, value: string) => void;
    reset: () => void;
};

const OnboardingCtx = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
    const [survey, setSurvey] = useState<SurveyState>({});

    const value = useMemo<Ctx>(
        () => ({
            survey,
            setAnswer: (key, value) => setSurvey((s) => ({ ...s, [key]: value })),
            reset: () => setSurvey({}),
        }),
        [survey]
    );

    return <OnboardingCtx.Provider value={value}>{children}</OnboardingCtx.Provider>;
}

export function useOnboarding() {
    const ctx = useContext(OnboardingCtx);
    if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
    return ctx;
}
