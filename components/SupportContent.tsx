import React from "react";
import { View, Text } from "react-native";

export function HelpFAQContent() {
    return (
        <View>
            <Text className="text-white text-2xl font-extrabold mb-4">Frequently Asked Questions</Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-4">How do I create a story?</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                Tap the "Create" tab and answer the simple survey questions. Moonstone will generate a personalized bedtime story just for you using AI magic! ✨
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">How do credits work?</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                Each story creation costs 1 Moonstone credit. You can purchase credit packs anytime from the Settings page.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Can I download my stories?</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                Yes! All your stories are saved in the Library tab. You can listen to them anytime, even offline.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">How do I change the narrator voice?</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                Go to Settings → Narrator Voice and choose from our premium voice options. Your preference will be saved for future stories.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">What is the sleep timer?</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                The sleep timer automatically pauses playback after a set duration, perfect for falling asleep. Configure it in Settings → Sleep Timer.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Need more help?</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                Contact our support team at support@moonstone.app and we'll get back to you within 24 hours. 💜
            </Text>
        </View>
    );
}

export function PrivacyPolicyContent() {
    return (
        <View>
            <Text className="text-white text-2xl font-extrabold mb-4">Privacy Policy</Text>
            <Text className="text-white/50 font-medium text-sm mb-6">Last updated: January 9, 2026</Text>

            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                At Moonstone, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-4">Information We Collect</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                • Account information (email address){"\n"}
                • Story preferences and settings{"\n"}
                • Usage data and analytics{"\n"}
                • Payment information (processed securely by Stripe)
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">How We Use Your Data</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                • To generate personalized bedtime stories{"\n"}
                • To improve our AI models and services{"\n"}
                • To process payments and manage subscriptions{"\n"}
                • To send important account updates
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Data Security</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                We use industry-standard encryption and security measures to protect your data. All stories and personal information are stored securely on Google Cloud Platform.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Your Rights</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                You have the right to access, modify, or delete your personal data at any time. Contact us at privacy@moonstone.app to exercise these rights.
            </Text>

            <Text className="text-white/70 font-medium text-base leading-6 mb-4 mt-4">
                For the complete privacy policy, please visit our website at moonstone.app/privacy
            </Text>
        </View>
    );
}

export function TermsOfServiceContent() {
    return (
        <View>
            <Text className="text-white text-2xl font-extrabold mb-4">Terms of Service</Text>
            <Text className="text-white/50 font-medium text-sm mb-6">Last updated: January 9, 2026</Text>

            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                By using Moonstone, you agree to these terms. Please read them carefully.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-4">Acceptance of Terms</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                By creating an account and using Moonstone, you accept and agree to be bound by these Terms of Service and our Privacy Policy.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Service Description</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                Moonstone provides AI-generated personalized bedtime stories with text-to-speech narration. The service is provided "as is" and we reserve the right to modify or discontinue features at any time.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Credits & Payments</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                • Credits are non-refundable{"\n"}
                • Each story creation costs 1 credit{"\n"}
                • Unused credits do not expire{"\n"}
                • All payments are processed securely by Stripe
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Content Ownership</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                You retain ownership of stories generated for your account. Moonstone may use anonymized story data to improve our AI models.
            </Text>

            <Text className="text-primary font-extrabold text-base mb-2 mt-2">Prohibited Use</Text>
            <Text className="text-white/70 font-medium text-base leading-6 mb-4">
                You may not use Moonstone to create inappropriate, harmful, or illegal content. We reserve the right to terminate accounts that violate this policy.
            </Text>

            <Text className="text-white/70 font-medium text-base leading-6 mb-4 mt-4">
                For the complete terms of service, please visit moonstone.app/terms
            </Text>
        </View>
    );
}
