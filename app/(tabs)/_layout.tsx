import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";

import { BedtimeModeProvider } from "@/components/BedtimeModeContext";
import { useFirebase } from "@/components/FirebaseStore";
import { useTheme } from "@/contexts/ThemeContext";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function TabLayout() {
  const { user, isLoading } = useFirebase();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#06020A", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#8e2de2" />
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
          tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.primary2,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
            tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="sleep"
          options={{
            title: "Sleep",
            tabBarIcon: ({ color, size }) => <Ionicons name="moon-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </BedtimeModeProvider>
  );
}
