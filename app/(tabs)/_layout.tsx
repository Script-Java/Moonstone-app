import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Redirect } from "expo-router";
import { useFirebase } from "@/components/FirebaseStore";
import { ActivityIndicator, View } from "react-native";
import { BedtimeModeProvider } from "@/components/BedtimeModeContext";

export default function TabLayout() {
  const { user, isLoading } = useFirebase();

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
          tabBarStyle: { backgroundColor: "#120b18", borderTopColor: "rgba(255,255,255,0.08)" },
          tabBarActiveTintColor: "#8e2de2",
          tabBarInactiveTintColor: "rgba(255,255,255,0.45)",
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
