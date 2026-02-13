import { useFirebase } from "@/components/FirebaseStore";
import Screen from "@/components/Screen";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

interface ValidationErrors {
    email?: string;
    password?: string;
    username?: string;
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password: string): { isValid: boolean; error?: string } {
    if (password.length < 8) {
        return { isValid: false, error: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, error: "Password must contain at least one number" };
    }
    return { isValid: true };
}

export default function Auth() {
    const { auth } = useFirebase();

    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};

        // Email validation
        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!validateEmail(email)) {
            newErrors.email = "Please enter a valid email address";
        }

        // Password validation
        if (!password) {
            newErrors.password = "Password is required";
        } else if (mode === "signup") {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                newErrors.password = passwordValidation.error;
            }
        }

        // Username validation for signup
        if (mode === "signup" && !username.trim()) {
            newErrors.username = "Username is required";
        } else if (mode === "signup" && username.trim().length < 2) {
            newErrors.username = "Username must be at least 2 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAuth = async () => {
        if (!auth) {
            Alert.alert("Error", "Authentication service is not available");
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

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
            let errorMessage = "An error occurred";
            
            switch (e.code) {
                case "auth/invalid-email":
                    errorMessage = "Invalid email address";
                    break;
                case "auth/user-disabled":
                    errorMessage = "This account has been disabled";
                    break;
                case "auth/user-not-found":
                    errorMessage = "No account found with this email";
                    break;
                case "auth/wrong-password":
                    errorMessage = "Incorrect password";
                    break;
                case "auth/email-already-in-use":
                    errorMessage = "An account already exists with this email";
                    break;
                case "auth/weak-password":
                    errorMessage = "Password is too weak";
                    break;
                case "auth/invalid-credential":
                    errorMessage = "Invalid email or password";
                    break;
                case "auth/network-request-failed":
                    errorMessage = "Network error. Please check your connection";
                    break;
                case "auth/too-many-requests":
                    errorMessage = "Too many attempts. Please try again later";
                    break;
                default:
                    errorMessage = e.message || "Authentication failed";
            }
            
            Alert.alert("Authentication Error", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!auth) {
            Alert.alert("Error", "Authentication service is not available");
            return;
        }

        if (!email.trim()) {
            setErrors({ email: "Please enter your email address" });
            return;
        }

        if (!validateEmail(email)) {
            setErrors({ email: "Please enter a valid email address" });
            return;
        }

        setIsLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert(
                "Password Reset Email Sent",
                "Check your inbox for instructions to reset your password",
                [{ text: "OK", onPress: () => setShowForgotPassword(false) }]
            );
        } catch (e: any) {
            let errorMessage = "Failed to send reset email";
            
            switch (e.code) {
                case "auth/user-not-found":
                    errorMessage = "No account found with this email";
                    break;
                case "auth/invalid-email":
                    errorMessage = "Invalid email address";
                    break;
                case "auth/network-request-failed":
                    errorMessage = "Network error. Please check your connection";
                    break;
                default:
                    errorMessage = e.message || "Failed to send reset email";
            }
            
            Alert.alert("Error", errorMessage);
        } finally {
            setIsLoading(false);
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
                            <View className={`flex-row items-center px-6 py-5 border-b border-border/50 ${errors.email ? 'bg-red-500/10' : ''}`}>
                                <Ionicons name="mail-outline" size={18} color={errors.email ? "#ef4444" : COLORS.primary} />
                                <TextInput
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (errors.email) setErrors({ ...errors, email: undefined });
                                    }}
                                    className="flex-1 text-white font-bold ml-4 text-base"
                                    placeholder="Email address"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!isLoading}
                                />
                            </View>
                            {errors.email && (
                                <Text className="text-red-400 text-xs px-6 pb-2 font-semibold">{errors.email}</Text>
                            )}
                            {mode === "signup" && (
                                <>
                                    <View className={`flex-row items-center px-6 py-5 border-b border-border/50 ${errors.username ? 'bg-red-500/10' : ''}`}>
                                        <Ionicons name="person-outline" size={18} color={errors.username ? "#ef4444" : COLORS.primary} />
                                        <TextInput
                                            value={username}
                                            onChangeText={(text) => {
                                                setUsername(text);
                                                if (errors.username) setErrors({ ...errors, username: undefined });
                                            }}
                                            className="flex-1 text-white font-bold ml-4 text-base"
                                            placeholder="Username"
                                            placeholderTextColor="rgba(255,255,255,0.2)"
                                            autoCapitalize="none"
                                            editable={!isLoading}
                                        />
                                    </View>
                                    {errors.username && (
                                        <Text className="text-red-400 text-xs px-6 pb-2 font-semibold">{errors.username}</Text>
                                    )}
                                </>
                            )}
                            <View className={`flex-row items-center px-6 py-5 ${errors.password ? 'bg-red-500/10' : ''}`}>
                                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? "#ef4444" : COLORS.primary} />
                                <TextInput
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) setErrors({ ...errors, password: undefined });
                                    }}
                                    className="flex-1 text-white font-bold ml-4 text-base"
                                    placeholder="Password"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    secureTextEntry={!showPassword}
                                    editable={!isLoading}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color="rgba(255,255,255,0.3)"
                                    />
                                </Pressable>
                            </View>
                            {errors.password && (
                                <Text className="text-red-400 text-xs px-6 pb-2 font-semibold">{errors.password}</Text>
                            )}
                        </View>

                        {mode === "login" && !showForgotPassword && (
                            <Pressable 
                                className="self-end mr-2 mb-8"
                                onPress={() => setShowForgotPassword(true)}
                                disabled={isLoading}
                            >
                                <Text className="text-primary font-bold text-[10px] uppercase tracking-widest">
                                    Forgot Password?
                                </Text>
                            </Pressable>
                        )}

                        {/* Forgot Password Modal */}
                        {showForgotPassword && (
                            <View className="bg-surface border border-border rounded-2xl p-6 mb-6">
                                <Text className="text-white font-bold text-lg mb-2">Reset Password</Text>
                                <Text className="text-white/60 text-sm mb-4">
                                    Enter your email and we'll send you a reset link
                                </Text>
                                <View className="flex-row items-center bg-white/5 rounded-xl px-4 py-3 mb-4">
                                    <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                                    <TextInput
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (errors.email) setErrors({ ...errors, email: undefined });
                                        }}
                                        className="flex-1 text-white font-bold ml-3"
                                        placeholder="Email address"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!isLoading}
                                    />
                                </View>
                                {errors.email && (
                                    <Text className="text-red-400 text-xs mb-3 font-semibold">{errors.email}</Text>
                                )}
                                <View className="flex-row gap-3">
                                    <Pressable 
                                        className="flex-1 bg-white/5 py-3 rounded-xl items-center"
                                        onPress={() => setShowForgotPassword(false)}
                                        disabled={isLoading}
                                    >
                                        <Text className="text-white/60 font-bold">Cancel</Text>
                                    </Pressable>
                                    <Pressable 
                                        className="flex-1 bg-primary py-3 rounded-xl items-center"
                                        onPress={handleForgotPassword}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="black" size="small" />
                                        ) : (
                                            <Text className="text-black font-bold">Send Reset Link</Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        )}

                        {/* --- MAIN ACTION CTA --- */}
                        <Pressable
                            onPress={handleAuth}
                            disabled={isLoading}
                            className={`w-full bg-primary rounded-2xl py-5 items-center shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform ${isLoading ? 'opacity-70' : ''}`}
                        >
                            <View className="flex-row items-center">
                                {isLoading ? (
                                    <ActivityIndicator color="black" size="small" />
                                ) : (
                                    <>
                                        <Text className="text-black font-black text-lg tracking-tight">
                                            {mode === "login" ? "Resume Dreaming" : "Create My Vault"}
                                        </Text>
                                        <Ionicons name="arrow-forward" size={18} color="black" style={{ marginLeft: 8 }} />
                                    </>
                                )}
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