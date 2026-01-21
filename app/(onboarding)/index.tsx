import Screen from "@/components/Screen";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

export default function Welcome() {
    const router = useRouter();

    return (
        <Screen>
            <View className="flex-1">
                {/* --- IMMERSIVE BACKGROUND --- */}
                <Image
                    source={{ uri: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=80" }}
                    className="absolute inset-0 w-full h-full opacity-40"
                    resizeMode="cover"
                />
                <View className="absolute inset-0 bg-black/50" />
                <View className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />

                {/* --- CONTENT LAYER --- */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="w-full max-w-xl self-center px-8 py-12 items-start">

                        {/* --- TOP SECTION: LOGO & NAME --- */}
                        <View className="items-start mb-10">
                            {/* 1. Fixed the container width to match the logo (w-12 = 48px)
                                2. Added explicit style to the Image as a fallback for NativeWind
                            */}
                            <View className="w-16 h-16 items-start justify-center mb-3">
                                <Image
                                    source={require("@/assets/images/moonstone-logo.png")}
                                    style={{ width: 64, height: 64 }}
                                    resizeMode="contain"
                                />
                            </View>

                            <Text className="text-primary font-bold tracking-[4px] text-[10px] uppercase">
                                Moonstone Studio
                            </Text>
                        </View>

                        {/* --- MIDDLE SECTION: VALUE PROPOSITION --- */}
                        <View className="mb-12">
                            <Text className="text-white text-6xl font-extrabold tracking-tighter leading-[56px]">
                                Cozy Tales{"\n"}
                                <Text className="italic font-light text-white/80">For Two</Text>
                            </Text>
                            <Text className="text-white/50 text-lg font-medium mt-6 leading-7 max-w-sm">
                                Reconnect through the art of storytelling. Personalized audio journeys designed for couples to drift off together.
                            </Text>
                        </View>

                        {/* --- BOTTOM SECTION: CTA --- */}
                        <View className="w-full">
                            <Pressable
                                onPress={() => router.push("/(onboarding)/survey")}
                                className="bg-primary rounded-2xl py-5 items-center shadow-2xl shadow-primary/20 w-full active:scale-[0.98] transition-transform"
                            >
                                <View className="flex-row items-center justify-center">
                                    <Text className="text-black font-black text-xl tracking-tight">
                                        Begin the Journey
                                    </Text>
                                    <Ionicons name="arrow-forward" size={20} color="black" style={{ marginLeft: 8 }} />
                                </View>
                            </Pressable>

                            <View className="mt-10 items-start">
                                <View className="flex-row items-center bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                                    <Ionicons name="headset-outline" size={14} color="rgba(255,255,255,0.4)" />
                                    <Text className="text-white/40 font-bold tracking-[2px] text-[9px] uppercase ml-2">
                                        Spatial Audio Recommended
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Info */}
                <View className="absolute bottom-6 left-8 opacity-20">
                    <Text className="text-white text-[8px] font-bold tracking-[4px] uppercase">
                        Moonstone v2.4.1
                    </Text>
                </View>
            </View>
        </Screen>
    );
}