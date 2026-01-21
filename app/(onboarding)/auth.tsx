import { useFirebase } from "@/components/FirebaseStore";
import Screen from "@/components/Screen";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function Auth() {
    const { auth } = useFirebase();

    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async () => {
        if (!auth) return;

        // Validate username for signup
        if (mode === "signup" && !username.trim()) {
            alert("Please enter a username");
            return;
        }

        try {
            if (mode === "login") {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Set the username as displayName
                await updateProfile(userCredential.user, {
                    displayName: username.trim()
                });
            }
            router.replace("/(tabs)/sleep");
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <Screen>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                {/* --- BACKGROUND LAYER --- */}
                <Image
                    source={{ uri: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=80" }}
                    className="absolute inset-0 w-full h-full opacity-30"
                    resizeMode="cover"
                />
                <View className="absolute inset-0 bg-black/60" />

                {/* --- RESPONSIVE WRAPPER --- */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                >
                    {/* max-w-md self-center keeps the form centered on Web, items-start aligns content left */}
                    <View className="w-full max-w-md self-center px-8 py-10 items-start">

                        {/* --- BRAND HEADER (NOW LEFT ALIGNED) --- */}
                        <View className="mb-12">
                            <Text className="text-primary font-bold tracking-[4px] text-[10px] uppercase ml-1">
                                Moonstone Studio
                            </Text>
                            <Text className="text-white text-6xl font-extrabold tracking-tighter mt-2 leading-[56px]">
                                {mode === "login" ? "Welcome\nBack" : "Begin Your\nJourney"}
                            </Text>
                        </View>

                        {/* --- AUTH TOGGLE --- */}
                        <View className="w-full bg-white/5 border border-white/10 rounded-2xl p-1 flex-row mb-8 backdrop-blur-md">
                            <Pressable
                                onPress={() => setMode("login")}
                                className={`flex-1 py-3 rounded-xl items-center transition-colors ${mode === "login" ? "bg-primary" : ""}`}
                            >
                                <Text className={`font-bold text-[10px] uppercase tracking-widest ${mode === "login" ? "text-black" : "text-white/40"}`}>
                                    Log In
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setMode("signup")}
                                className={`flex-1 py-3 rounded-xl items-center transition-colors ${mode === "signup" ? "bg-primary" : ""}`}
                            >
                                <Text className={`font-bold text-[10px] uppercase tracking-widest ${mode === "signup" ? "text-black" : "text-white/40"}`}>
                                    Join Us
                                </Text>
                            </Pressable>
                        </View>

                        {/* --- INPUT GROUP (THE "VAULT" CARD) --- */}
                        <View className="w-full bg-surface border border-border rounded-[32px] overflow-hidden mb-4 shadow-2xl">
                            <View className="flex-row items-center px-6 py-5 border-b border-border/50">
                                <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    className="flex-1 text-white font-bold ml-4 text-base"
                                    placeholder="Email address"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                            {mode === "signup" && (
                                <View className="flex-row items-center px-6 py-5 border-b border-border/50">
                                    <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                                    <TextInput
                                        value={username}
                                        onChangeText={setUsername}
                                        className="flex-1 text-white font-bold ml-4 text-base"
                                        placeholder="Username"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        autoCapitalize="none"
                                    />
                                </View>
                            )}
                            <View className="flex-row items-center px-6 py-5">
                                <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    className="flex-1 text-white font-bold ml-4 text-base"
                                    placeholder="Password"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="rgba(255,255,255,0.3)"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {mode === "login" && (
                            <Pressable className="self-end mr-2 mb-8">
                                <Text className="text-primary font-bold text-[10px] uppercase tracking-widest">
                                    Forgot Password?
                                </Text>
                            </Pressable>
                        )}

                        {/* --- MAIN ACTION CTA --- */}
                        <Pressable
                            onPress={handleAuth}
                            className="w-full bg-primary rounded-2xl py-5 items-center shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform"
                        >
                            <View className="flex-row items-center">
                                <Text className="text-black font-black text-lg tracking-tight">
                                    {mode === "login" ? "Resume Dreaming" : "Create My Vault"}
                                </Text>
                                <Ionicons name="arrow-forward" size={18} color="black" style={{ marginLeft: 8 }} />
                            </View>
                        </Pressable>

                        {/* --- LEGAL FOOTER --- */}
                        <View className="w-full mt-12 items-center">
                            <Text className="text-white/20 text-center text-[9px] font-bold tracking-[2px] uppercase leading-5">
                                By continuing, you accept our{"\n"}
                                <Text className="text-white/40 underline">Terms of Service</Text> & <Text className="text-white/40 underline">Privacy Policy</Text>
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
}