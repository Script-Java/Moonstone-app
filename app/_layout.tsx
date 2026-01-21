// app/_layout.tsx
import { FirebaseProvider } from "@/components/FirebaseStore";
import { OnboardingProvider } from "@/components/OnboardingStore";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";
import "react-native-reanimated";
import { configureReanimatedLogger } from "react-native-reanimated";
import "../global.css";

// Disable Reanimated strict mode warnings
configureReanimatedLogger({
  strict: false,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    LogBox.ignoreLogs([
      "Expo AV has been deprecated",
      "props.pointerEvents is deprecated",
    ]);
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    (async () => {
      try {
        await import("expo-audio");
        console.log("✅ New Expo Audio configured (module loaded)");
      } catch (e) {
        console.warn("⚠️ Audio config error:", e);
      }
    })();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <FirebaseProvider>
        <OnboardingProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </OnboardingProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
