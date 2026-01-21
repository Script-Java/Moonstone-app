import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import { BedtimeModeProvider } from "@/components/BedtimeModeContext";
import { useFirebase } from "@/components/FirebaseStore";
import { COLORS } from "@/constants/colors";

export default function TabLayout() {
  const { user, isLoading } = useFirebase();


  const activeColor = COLORS.primary; // The Cream color
  const inactiveColor = "rgba(255, 255, 255, 0.3)";

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(onboarding)/auth" />;
  }

  return (
    <BedtimeModeProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: inactiveColor,

          // --- REFINED TYPOGRAPHY ---
          tabBarLabelStyle: {
            // Using a slightly smaller size with high weight and wide tracking
            fontSize: 9,
            fontWeight: "900",
            textTransform: "uppercase",
            letterSpacing: 2.2, // This "breathable" spacing is the key to a high-end look
            marginTop: 6,
            // Smooths out the text rendering on some screens
            fontVariant: ['small-caps'],
          },

          tabBarStyle: {
            backgroundColor: "#0D0D0D",
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.05)",
            height: Platform.OS === 'ios' ? 92 : 72,
            paddingTop: 14,
            paddingBottom: Platform.OS === 'ios' ? 32 : 14,
            elevation: 0,
          },

          tabBarBackground: () => (
            <BlurView intensity={60} tint="dark" style={{ flex: 1 }} />
          ),
        }}
      >
        <Tabs.Screen
          name="create"
          options={{
            title: "Weave", // Shorter, more evocative titles often feel more premium
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "sparkles" : "sparkles-outline"}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="sleep"
          options={{
            title: "Dream",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "moon" : "moon-outline"}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Vault",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "bookmark" : "bookmark-outline"}
                size={20}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Self",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                size={20}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </BedtimeModeProvider>
  );
}