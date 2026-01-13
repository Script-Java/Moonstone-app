import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { router } from "expo-router";
import Screen from "@/components/Screen";

export default function Welcome() {
    return (
        <Screen>
            <View className="flex-1">
                {/* Top visual */}
                <View className="flex-1 items-center justify-center">
                    <Image
                        source={{ uri: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=80" }}
                        className="absolute inset-0 w-full h-full opacity-60"
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/40" />

                    <View className="h-24 w-24 rounded-full bg-white/10 border border-white/15 items-center justify-center">
                        <Text className="text-white text-4xl">☾</Text>
                    </View>
                </View>

                {/* Bottom content */}
                <View className="px-7 pb-10 pt-10 bg-[#1b0f25]/70 border-t border-white/10">
                    <Text className="text-white/90 font-extrabold tracking-[10px] text-center text-3xl">MOONSTONE</Text>

                    <Text className="text-white text-4xl font-extrabold text-center mt-6">
                        Cozy bedtime stories{"\n"}for two
                    </Text>

                    <Text className="text-white/45 text-center mt-4 text-lg leading-7">
                        Reconnect and relax. Personalized audio journeys designed for couples to drift off together.
                    </Text>

                    <Pressable onPress={() => router.push("/(onboarding)/q1")} className="mt-8 rounded-full overflow-hidden">
                        <View className="bg-[#7311d4] py-5 items-center rounded-full">
                            <Text className="text-white font-extrabold text-2xl">Begin Your Journey  →</Text>
                        </View>
                    </Pressable>

                    <Text className="text-white/35 text-center mt-6 font-semibold tracking-widest">HEADPHONES RECOMMENDED</Text>
                </View>
            </View>
        </Screen>
    );
}
