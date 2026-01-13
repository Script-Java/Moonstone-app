import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Image } from "react-native";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase } from "@/components/FirebaseStore";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/components/Screen";

export default function Auth() {
    const { auth } = useFirebase();
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("dreamer@moonstone.app");
    const [password, setPassword] = useState("");

    return (
        <Screen>
            <View className="flex-1">
                <Image
                    source={{ uri: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=1200&q=80" }}
                    className="absolute inset-0 w-full h-full opacity-45"
                    resizeMode="cover"
                />
                <View className="absolute inset-0 bg-black/55" />

                <View className="flex-1 px-6 pt-10">
                    <Text className="text-white/85 font-extrabold text-center text-2xl">Moonstone</Text>
                    <Text className="text-white text-5xl font-extrabold text-center mt-3">Sweet Dreams Await</Text>

                    {/* Toggle */}
                    <View className="mt-8 rounded-full bg-white/5 border border-white/10 p-1 flex-row">
                        <Pressable
                            onPress={() => setMode("login")}
                            className={["flex-1 py-3 rounded-full items-center", mode === "login" ? "bg-black/40" : ""].join(" ")}
                        >
                            <Text className={["font-extrabold text-lg", mode === "login" ? "text-white" : "text-white/45"].join(" ")}>Log In</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setMode("signup")}
                            className={["flex-1 py-3 rounded-full items-center", mode === "signup" ? "bg-black/40" : ""].join(" ")}
                        >
                            <Text className={["font-extrabold text-lg", mode === "signup" ? "text-white" : "text-white/45"].join(" ")}>Sign Up</Text>
                        </Pressable>
                    </View>

                    {/* Email */}
                    <View className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 flex-row items-center gap-3">
                        <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.55)" />
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            className="flex-1 text-white font-bold text-lg"
                            placeholder="Email"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    {/* Password */}
                    <View className="mt-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 flex-row items-center gap-3">
                        <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.55)" />
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            className="flex-1 text-white font-bold text-lg"
                            placeholder="Enter your password"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                            secureTextEntry
                        />
                        <Ionicons name="eye-outline" size={20} color="rgba(255,255,255,0.35)" />
                    </View>

                    <Pressable className="mt-3 self-end">
                        <Text className="text-[#8e2de2] font-extrabold">Forgot Password?</Text>
                    </Pressable>

                    {/* Main action */}
                    <Pressable
                        onPress={async () => {
                            if (!auth) return;
                            try {
                                if (mode === "login") {
                                    await signInWithEmailAndPassword(auth, email, password);
                                } else {
                                    await createUserWithEmailAndPassword(auth, email, password);
                                }
                                router.replace("/(tabs)/sleep");
                            } catch (e: any) {
                                alert(e.message);
                            }
                        }}
                        className="mt-6 rounded-full overflow-hidden"
                    >
                        <View className="bg-[#7311d4] py-5 items-center rounded-full">
                            <Text className="text-white font-extrabold text-2xl">
                                {mode === "login" ? "Resume Dreaming" : "Create Account"}  →
                            </Text>
                        </View>
                    </Pressable>

                    <Text className="text-white/30 text-center mt-6 leading-6">
                        By continuing, you agree to our{" "}
                        <Text className="underline">Terms of Service</Text> and <Text className="underline">Privacy Policy</Text>.
                    </Text>
                </View>
            </View>
        </Screen>
    );
}
