import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { FirebaseProvider } from "@/components/FirebaseStore";
import { ThemeProvider as AppThemeProvider } from "@/contexts/ThemeContext";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)/create",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    LogBox.ignoreLogs([
      "Expo AV has been deprecated",
      "props.pointerEvents is deprecated",
    ]);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <FirebaseProvider>
        <AppThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
          </Stack>
          <StatusBar style="auto" />
        </AppThemeProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}

