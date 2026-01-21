import { useOnboarding } from "@/components/OnboardingStore";
import Screen from "@/components/Screen";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

// --- Constants & Types ---

type OptionKey = string;

const STEPS = {
    1: {
        label: "Your Quiet Hour",
        title: "As you settle in, how does your",
        highlight: "heart feel?",
        options: [
            { key: "Peaceful", title: "Peaceful and content", icon: "leaf-outline" as const },
            { key: "Busy", title: "A little busy, seeking calm", icon: "layers-outline" as const },
            { key: "Connection", title: "Longing for connection", icon: "heart-outline" as const },
            { key: "Wonder", title: "Ready for gentle wonder", icon: "sparkles-outline" as const },
        ]
    },
    2: {
        label: "Your Bedtime Journey",
        title: "What whispers do you hope to hear as the",
        highlight: "day fades?",
        options: [
            { key: "Drift", title: "To drift away gently", icon: "cloud-outline" as const },
            { key: "Calm", title: "To calm a restless mind", icon: "water-outline" as const },
            { key: "Closeness", title: "To share a moment of closeness", icon: "people-outline" as const },
            { key: "Rhythm", title: "To find a new nightly rhythm", icon: "infinite-outline" as const },
        ]
    },
    3: {
        label: "When Stars Appear",
        title: "When does this tranquil moment",
        highlight: "begin for you?",
        options: [
            { key: "LieDown", title: "As I first lie down", icon: "bed-outline" as const },
            { key: "CloseEyes", title: "Just before I close my eyes", icon: "eye-off-outline" as const },
            { key: "Awaken", title: "If I awaken in the night", icon: "notifications-off-outline" as const },
            { key: "Pause", title: "Anytime I need a gentle pause", icon: "cafe-outline" as const },
        ]
    },
    4: {
        label: "Shared Dreams",
        title: "Who will share this",
        highlight: "tranquil space?",
        options: [
            { key: "Solo", title: "Just for me, tonight", subtitle: "A moment of solitude", icon: "moon-outline" as const },
            { key: "Partner", title: "With my beloved partner", subtitle: "Sync your sleep journey", icon: "heart-outline" as const },
            { key: "Sometimes", title: "Sometimes with a loved one", subtitle: "We'll ask before each story", icon: "star-outline" as const },
        ]
    }
};

export default function SurveyScreen() {
    const router = useRouter();
    const onboarding = useOnboarding();
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    if (!onboarding || !onboarding.survey) return null;

    const currentSelection = useMemo(() => {
        switch (step) {
            case 1: return onboarding.survey.q1;
            case 2: return onboarding.survey.q2;
            case 3: return onboarding.survey.q3;
            case 4: return onboarding.survey.q4;
            default: return undefined;
        }
    }, [step, onboarding.survey]);

    const currentStepData = STEPS[step];

    const handleSelect = (key: string) => {
        const qKey = `q${step}` as keyof typeof onboarding.survey;
        onboarding.setAnswer(qKey, key);
    };

    const handleNext = () => {
        if (step < 4) {
            setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
        } else {
            router.push("/(onboarding)/auth");
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
        } else {
            router.back();
        }
    };

    const handleSkip = () => {
        router.push("/(onboarding)/auth");
    };

    const renderOption = (opt: { key: string; title: string; subtitle?: string; icon: any }) => {
        const isActive = currentSelection === opt.key;
        const isDetailed = step === 4;

        return (
            <Pressable
                key={opt.key}
                onPress={() => handleSelect(opt.key)}
                style={[
                    styles.option,
                    isDetailed ? styles.optionDetailed : styles.optionNormal,
                    isActive ? styles.optionActive : styles.optionInactive
                ]}
            >
                <View style={[
                    styles.iconBox,
                    isDetailed ? styles.iconBoxLarge : styles.iconBoxSmall,
                    isActive ? styles.iconBoxActive : styles.iconBoxInactive
                ]}>
                    <Ionicons
                        name={opt.icon}
                        size={isDetailed ? 24 : 20}
                        color={isActive ? "black" : COLORS.primary}
                    />
                </View>

                <View style={styles.textContent}>
                    <Text style={[
                        styles.optionTitle,
                        isDetailed ? styles.optionTitleLarge : styles.optionTitleNormal,
                        isActive ? styles.textBlack : styles.textWhite
                    ]}>
                        {opt.title}
                    </Text>
                    {opt.subtitle && (
                        <Text style={[
                            styles.optionSubtitle,
                            isActive ? styles.textBlackMuted : styles.textWhiteMuted
                        ]}>
                            {opt.subtitle}
                        </Text>
                    )}
                </View>

                {isActive && (
                    <Ionicons
                        name="checkmark-circle"
                        size={isDetailed ? 24 : 22}
                        color="black"
                    />
                )}
            </Pressable>
        );
    };

    return (
        <Screen>
            <View style={styles.container}>
                <View style={styles.content}>
                    {/* Header Navigation */}
                    <View style={styles.header}>
                        <Pressable
                            onPress={handleBack}
                            style={styles.backButton}
                            hitSlop={10}
                        >
                            <Ionicons name="chevron-back" size={20} color="white" />
                        </Pressable>

                        {/* Progress Indicators */}
                        <View style={styles.progressContainer}>
                            {[1, 2, 3, 4].map((s) => (
                                <View
                                    key={s}
                                    style={[
                                        styles.progressBar,
                                        s === step ? styles.progressActive :
                                            s < step ? styles.progressCompleted :
                                                styles.progressInactive
                                    ]}
                                />
                            ))}
                        </View>

                        <Pressable onPress={handleSkip} hitSlop={10} style={styles.skipButton}>
                            <Text style={styles.skipText}>SKIP</Text>
                        </Pressable>
                    </View>

                    {/* Main Content */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={styles.scrollView}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        {/* Question Header */}
                        <View style={styles.questionHeader}>
                            <Text style={styles.label}>
                                {currentStepData.label}
                            </Text>
                            <Text style={styles.questionTitle}>
                                {currentStepData.title}{"\n"}
                                <Text style={styles.questionHighlight}>
                                    {currentStepData.highlight}
                                </Text>
                            </Text>
                        </View>

                        {/* Options List */}
                        <View style={styles.optionsList}>
                            {currentStepData.options.map((opt) => renderOption(opt))}
                        </View>
                    </ScrollView>

                    {/* Footer Action */}
                    <View style={styles.footer}>
                        <Pressable
                            disabled={!currentSelection}
                            onPress={handleNext}
                            style={[
                                styles.continueButton,
                                currentSelection ? styles.continueButtonActive : styles.continueButtonInactive
                            ]}
                        >
                            <Text style={[
                                styles.continueText,
                                currentSelection ? styles.textBlack : styles.textWhiteFaint
                            ]}>
                                {step === 4 ? "Unlock Your Stories" : "Continue"}
                            </Text>
                            <Ionicons
                                name={step === 4 ? "sparkles" : "arrow-forward"}
                                size={step === 4 ? 18 : 20}
                                color={currentSelection ? "black" : "rgba(255,255,255,0.1)"}
                            />
                        </Pressable>
                    </View>
                </View>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 672, // xl breakpoint
        flex: 1,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 32,
        marginBottom: 32,
    },
    backButton: {
        height: 40,
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    progressBar: {
        height: 4,
        borderRadius: 2,
    },
    progressActive: {
        width: 32,
        backgroundColor: COLORS.primary,
    },
    progressCompleted: {
        width: 8,
        backgroundColor: 'rgba(253,251,212,0.4)',
    },
    progressInactive: {
        width: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    skipButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    skipText: {
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
        fontSize: 10,
        letterSpacing: 2.2,
        textTransform: 'uppercase',
    },
    scrollView: {
        flex: 1,
    },
    questionHeader: {
        marginBottom: 40,
    },
    label: {
        color: COLORS.primary,
        fontWeight: '700',
        letterSpacing: 3,
        fontSize: 10,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    questionTitle: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 40,
    },
    questionHighlight: {
        fontStyle: 'italic',
        fontWeight: '300',
        color: 'rgba(255,255,255,0.8)',
    },
    optionsList: {
        gap: 16,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 1,
    },
    optionNormal: {
        padding: 20,
    },
    optionDetailed: {
        padding: 24,
        borderRadius: 28,
    },
    optionActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    optionInactive: {
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
    },
    iconBox: {
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxSmall: {
        height: 40,
        width: 40,
        borderRadius: 12,
    },
    iconBoxLarge: {
        height: 48,
        width: 48,
    },
    iconBoxActive: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    iconBoxInactive: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    textContent: {
        marginLeft: 16,
        flex: 1,
    },
    optionTitle: {
        fontWeight: '700',
    },
    optionTitleNormal: {
        fontSize: 16,
    },
    optionTitleLarge: {
        fontSize: 18,
    },
    optionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    textBlack: {
        color: '#000000',
    },
    textWhite: {
        color: '#FFFFFF',
    },
    textBlackMuted: {
        color: 'rgba(0,0,0,0.6)',
    },
    textWhiteMuted: {
        color: 'rgba(255,255,255,0.4)',
    },
    textWhiteFaint: {
        color: 'rgba(255,255,255,0.2)',
    },
    footer: {
        paddingVertical: 24,
    },
    continueButton: {
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    continueButtonActive: {
        backgroundColor: COLORS.primary,
    },
    continueButtonInactive: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        opacity: 0.5,
    },
    continueText: {
        fontWeight: '900',
        fontSize: 18,
        marginRight: 8,
    },
});
