import Screen from "@/components/Screen";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { useFirebase } from "@/components/FirebaseStore";
import PreferenceModal, { PreferenceOption } from "@/components/PreferenceModal";
import {
  HelpFAQContent,
  PrivacyPolicyContent,
  TermsOfServiceContent,
} from "@/components/SupportContent";
import SupportModal from "@/components/SupportModal";
import VoiceSelector, { VOICE_PACK, VoiceKey } from "@/components/VoiceSelector";
import { useTheme } from "@/contexts/ThemeContext";
import { router } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Preference options
// Theme options
const THEME_OPTIONS: PreferenceOption[] = [
  { value: "purple", label: "Purple", description: "Mystical purple gradient" },
  { value: "midnight", label: "Midnight", description: "Cool blue-tinted dark" },
  { value: "obsidian", label: "Obsidian", description: "Pure black minimalist" },
  { value: "slate", label: "Slate", description: "Warm charcoal tones" },
];

const MOOD_OPTIONS: PreferenceOption[] = [
  { value: "dreamy", label: "Dreamy", description: "Soft, whimsical adventures" },
  { value: "adventurous", label: "Adventurous", description: "Exciting quests and journeys" },
  { value: "calm", label: "Calm", description: "Peaceful, soothing tales" },
  { value: "magical", label: "Magical", description: "Enchanted worlds and spells" },
  { value: "nature", label: "Nature", description: "Animals and outdoor wonder" },
];



const SLEEP_TIMER_OPTIONS: PreferenceOption[] = [
  { value: "0", label: "Never", description: "Play continuously" },
  { value: "15", label: "15 minutes", description: "Quick power nap" },
  { value: "30", label: "30 minutes", description: "Perfect for most sleepers" },
  { value: "45", label: "45 minutes", description: "Extended relaxation" },
  { value: "60", label: "60 minutes", description: "Full hour of stories" },
];

export default function Settings() {
  const { user, db, auth } = useFirebase();
  const { theme, setTheme } = useTheme();
  const [credits, setCredits] = React.useState(0);
  const [isPremium, setIsPremium] = React.useState(false);
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);
  const [defaultMood, setDefaultMood] = React.useState("dreamy");
  const [defaultVoiceKey, setDefaultVoiceKey] = React.useState<VoiceKey>("gb_wavenet_d");
  const [sleepTimer, setSleepTimer] = React.useState("30");

  // Modal visibility states
  const [themeModalVisible, setThemeModalVisible] = React.useState(false);
  const [moodModalVisible, setMoodModalVisible] = React.useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = React.useState(false);
  const [timerModalVisible, setTimerModalVisible] = React.useState(false);
  const [helpModalVisible, setHelpModalVisible] = React.useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = React.useState(false);
  const [termsModalVisible, setTermsModalVisible] = React.useState(false);

  // Load user data from Firestore
  React.useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      const data = doc.data();
      setCredits(data?.credits || 0);
      setIsPremium(data?.isPremium || false);
      setPhotoURL(data?.photoURL || null);
      setDefaultMood(data?.defaultMood || "dreamy");
      setDefaultVoiceKey(data?.defaultVoiceKey || "gb_wavenet_d");
      setSleepTimer(String(data?.sleepTimer || 30));
    });
    return () => unsub();
  }, [user, db]);

  // Update preference in Firestore
  const updatePreference = async (field: string, value: any) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        [field]: value,
      });
    } catch (error) {
      console.error("Error updating preference:", error);
      Alert.alert("Error", "Failed to update preference. Please try again.");
    }
  };

  // Handle profile picture upload
  const handleProfilePictureUpload = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to change your profile picture."
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setPhotoURL(base64Image);
        await updatePreference("photoURL", base64Image);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      Alert.alert("Error", "Failed to upload profile picture. Please try again.");
    }
  };

  const handleLogout = () => {
    if (auth) auth.signOut();
    router.replace("/(onboarding)/auth");
  };

  // Get display labels for preferences
  const getThemeLabel = () =>
    THEME_OPTIONS.find((o) => o.value === theme)?.label || "Purple";
  const getMoodLabel = () =>
    MOOD_OPTIONS.find((o) => o.value === defaultMood)?.label || "Dreamy";
  const getVoiceLabel = () =>
    VOICE_PACK[defaultVoiceKey]?.name || "London Night";
  const getTimerLabel = () =>
    SLEEP_TIMER_OPTIONS.find((o) => o.value === sleepTimer)?.label || "30 min";

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 28 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <Text className="text-white text-xl font-extrabold">Settings</Text>
          <View className="h-11 w-11" />
        </View>

        {/* Profile */}
        <View className="mt-6 flex-row items-center gap-4">
          <View className="relative">
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                className="h-20 w-20 rounded-full border border-primary/30"
              />
            ) : (
              <View className="h-20 w-20 rounded-full bg-primary/20 items-center justify-center border border-primary/30">
                <Text className="text-primary font-extrabold text-3xl">
                  {(user?.email?.[0] || "D").toUpperCase()}
                </Text>
              </View>
            )}
            <Pressable
              onPress={handleProfilePictureUpload}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary items-center justify-center border border-border"
            >
              <Ionicons name="pencil" size={16} color="white" />
            </Pressable>
          </View>

          <View className="flex-1">
            <Text className="text-white text-2xl font-extrabold">
              {user?.displayName || user?.email?.split("@")[0] || "Dreamer"}
            </Text>
            <Text className="text-muted font-semibold">{user?.email || "dev@moonstone.app"}</Text>

            {isPremium && (
              <View className="mt-2 self-start flex-row items-center gap-2 rounded-full bg-good/20 border border-good/30 px-3 py-2">
                <Ionicons name="star" size={14} color="#34d399" />
                <Text className="text-good font-extrabold">Premium Member</Text>
              </View>
            )}
          </View>
        </View>

        {/* Credits card */}
        <View className="mt-6 rounded-3xl border border-border bg-surface p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Ionicons name="diamond" size={18} color="#8e2de2" />
              <Text className="text-white text-3xl font-extrabold">{credits}</Text>
            </View>
            <Pressable>
              <Text className="text-primary2 font-extrabold">Restore Purchases</Text>
            </Pressable>
          </View>

          <Text className="text-muted font-semibold mt-1">Moonstones Available</Text>

          <Pressable className="mt-4 rounded-2xl overflow-hidden">
            <View className="bg-primary px-5 py-4 items-center rounded-2xl flex-row justify-center gap-2">
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text className="text-white font-extrabold text-base">Get More Credits</Text>
            </View>
          </Pressable>
        </View>

        {/* Preferences */}
        <Text className="text-white/40 font-extrabold tracking-widest text-xs mt-7 mb-3">
          PREFERENCES
        </Text>

        <View className="rounded-3xl border border-border bg-surface overflow-hidden">
          <SettingRow
            icon="color-palette"
            title="App Theme"
            value={getThemeLabel()}
            onPress={() => setThemeModalVisible(true)}
          />
          <Divider />
          <SettingRow
            icon="moon"
            title="Default Mood"
            value={getMoodLabel()}
            onPress={() => setMoodModalVisible(true)}
          />
          <Divider />
          <SettingRow
            icon="mic"
            title="Narrator Voice"
            value={getVoiceLabel()}
            onPress={() => setVoiceModalVisible(true)}
          />
          <Divider />
          <SettingRow
            icon="timer"
            title="Sleep Timer"
            value={getTimerLabel()}
            onPress={() => setTimerModalVisible(true)}
          />
        </View>

        {/* TTS Diagnostic Mode */}
        <Text className="text-white/40 font-extrabold tracking-widest text-xs mt-7 mb-3">
          TTS DIAGNOSTIC MODE
        </Text>

        <DiagnosticSection voiceKey={defaultVoiceKey} />

        {/* Support */}
        <Text className="text-white/40 font-extrabold tracking-widest text-xs mt-7 mb-3">
          SUPPORT
        </Text>

        <View className="rounded-3xl border border-border bg-surface overflow-hidden">
          <SettingRow
            icon="help-circle"
            title="Help & FAQ"
            onPress={() => setHelpModalVisible(true)}
          />
          <Divider />
          <SettingRow
            icon="shield-checkmark"
            title="Privacy Policy"
            onPress={() => setPrivacyModalVisible(true)}
          />
          <Divider />
          <SettingRow
            icon="document-text"
            title="Terms of Service"
            onPress={() => setTermsModalVisible(true)}
          />
        </View>

        {/* Logout */}
        <View className="mt-6 rounded-3xl border border-border bg-surface overflow-hidden">
          <Pressable onPress={handleLogout} className="flex-row items-center px-4 py-5">
            <View className="h-11 w-11 rounded-2xl bg-danger/15 items-center justify-center border border-danger/20">
              <Ionicons name="log-out-outline" size={22} color="#fb7185" />
            </View>
            <Text className="ml-4 text-danger font-extrabold text-base">Log Out</Text>
          </Pressable>
        </View>

        <Text className="text-white/25 text-xs text-center mt-6 font-semibold">
          Moonstone v2.4.1 (Build 402)
        </Text>
      </ScrollView>

      {/* Preference Modals */}
      <PreferenceModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
        title="App Theme"
        icon="color-palette"
        options={THEME_OPTIONS}
        selectedValue={theme}
        onSelect={(value) => {
          setTheme(value as any);
        }}
      />

      <PreferenceModal
        visible={moodModalVisible}
        onClose={() => setMoodModalVisible(false)}
        title="Default Mood"
        icon="moon"
        options={MOOD_OPTIONS}
        selectedValue={defaultMood}
        onSelect={(value) => {
          setDefaultMood(value);
          updatePreference("defaultMood", value);
        }}
      />

      <Modal
        visible={voiceModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <Screen>
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Pressable
              onPress={() => setVoiceModalVisible(false)}
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
            >
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
            </Pressable>
            <Text className="text-white text-xl font-extrabold">Narrator Voice</Text>
            <View className="h-11 w-11" />
          </View>
          <VoiceSelector
            selectedVoice={defaultVoiceKey}
            onSelectVoice={(voiceKey) => {
              setDefaultVoiceKey(voiceKey);
              updatePreference("defaultVoiceKey", voiceKey);
              setVoiceModalVisible(false);
            }}
          />
        </Screen>
      </Modal>

      <PreferenceModal
        visible={timerModalVisible}
        onClose={() => setTimerModalVisible(false)}
        title="Sleep Timer"
        icon="timer"
        options={SLEEP_TIMER_OPTIONS}
        selectedValue={sleepTimer}
        onSelect={(value) => {
          setSleepTimer(value);
          updatePreference("sleepTimer", parseInt(value));
        }}
      />

      {/* Support Modals */}
      <SupportModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
        title="Help & FAQ"
        icon="help-circle"
        content={<HelpFAQContent />}
      />

      <SupportModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        title="Privacy Policy"
        icon="shield-checkmark"
        content={<PrivacyPolicyContent />}
      />

      <SupportModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        title="Terms of Service"
        icon="document-text"
        content={<TermsOfServiceContent />}
      />
    </Screen>
  );
}

function Divider() {
  return <View className="h-[1px] bg-white/5" />;
}

function SettingRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: any;
  title: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-5">
      <View className="h-11 w-11 rounded-2xl bg-white/8 items-center justify-center border border-border">
        <Ionicons name={icon} size={20} color="rgba(255,255,255,0.70)" />
      </View>

      <Text className="ml-4 text-white font-extrabold text-base">{title}</Text>

      <View className="ml-auto flex-row items-center gap-2">
        {value ? <Text className="text-white/50 font-bold">{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.35)" />
      </View>
    </Pressable>
  );
}

// Diagnostic Section Component
function DiagnosticSection({ voiceKey }: { voiceKey: VoiceKey }) {
  const { functions } = useFirebase();
  const [loading, setLoading] = React.useState(false);
  const [tests, setTests] = React.useState<any[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = React.useState<number | null>(null);
  const [audioPlayers, setAudioPlayers] = React.useState<Map<number, any>>(new Map());

  const generateTests = async () => {
    if (!functions) {
      Alert.alert("Error", "Firebase Functions not initialized");
      return;
    }

    setLoading(true);
    try {
      const generateDiagnosticAudio = httpsCallable(functions, "generateDiagnosticAudio");
      const result = await generateDiagnosticAudio({ voiceKey });

      if (result.data && (result.data as any).tests) {
        setTests((result.data as any).tests);
        Alert.alert(
          "Tests Generated ✅",
          "4 diagnostic audio files created. Play them in order and note which sounds robotic."
        );
      }
    } catch (err: any) {
      console.error("Failed to generate diagnostics:", err);
      Alert.alert("Error", err.message || "Failed to generate diagnostic tests");
    } finally {
      setLoading(false);
    }
  };

  const playTest = async (testNumber: number, url: string) => {
    try {
      // Import expo-av for audio playback
      const { Audio } = await import("expo-av");

      // Stop currently playing test
      if (currentlyPlaying !== null && audioPlayers.has(currentlyPlaying)) {
        const currentPlayer = audioPlayers.get(currentlyPlaying);
        if (currentPlayer) {
          await currentPlayer.pauseAsync();
        }
      }

      // If clicking the same test, just toggle
      if (currentlyPlaying === testNumber) {
        setCurrentlyPlaying(null);
        return;
      }

      // Get or create player for this test
      let player = audioPlayers.get(testNumber);
      if (!player) {
        const { sound } = await Audio.Sound.createAsync({ uri: url });
        player = sound;

        const newPlayers = new Map(audioPlayers);
        newPlayers.set(testNumber, player);
        setAudioPlayers(newPlayers);

        // Set up completion callback
        player.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setCurrentlyPlaying(null);
          }
        });
      }

      await player.playAsync();
      setCurrentlyPlaying(testNumber);
    } catch (err: any) {
      console.error("Playback error:", err);
      Alert.alert("Playback Error", err.message);
    }
  };

  return (
    <View className="rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="mic-outline" size={20} color="#8e2de2" />
          <Text className="text-white font-extrabold text-base">Voice Quality Tests</Text>
        </View>
        {tests.length > 0 && (
          <Pressable onPress={() => setTests([])}>
            <Text className="text-danger/80 font-bold text-sm">Clear</Text>
          </Pressable>
        )}
      </View>

      <Text className="text-white/60 font-semibold text-sm mb-4">
        Run 4 diagnostic tests to identify the cause of robotic voice quality.
      </Text>

      {tests.length === 0 ? (
        <Pressable
          onPress={generateTests}
          disabled={loading}
          className="bg-primary rounded-2xl p-4 items-center"
        >
          {loading ? (
            <Text className="text-white font-extrabold">Generating Tests...</Text>
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons name="flask-outline" size={18} color="white" />
              <Text className="text-white font-extrabold">Generate Test Files</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <View className="gap-3">
          {tests.map((test: any) => (
            <Pressable
              key={test.testNumber}
              onPress={() => playTest(test.testNumber, test.url)}
              className={[
                "border rounded-2xl p-4",
                currentlyPlaying === test.testNumber
                  ? "bg-primary/20 border-primary"
                  : "bg-white/5 border-border",
              ].join(" ")}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 mb-1">
                    <View className="bg-primary/30 px-2 py-1 rounded-lg">
                      <Text className="text-primary2 font-extrabold text-xs">
                        TEST {test.testNumber}
                      </Text>
                    </View>
                    <Text className="text-white font-extrabold text-sm" numberOfLines={1}>
                      {test.name}
                    </Text>
                  </View>
                  <Text className="text-white/50 font-semibold text-xs" numberOfLines={2}>
                    {test.description}
                  </Text>
                </View>
                <View className="h-10 w-10 rounded-full bg-white items-center justify-center">
                  <Ionicons
                    name={currentlyPlaying === test.testNumber ? "pause" : "play"}
                    size={18}
                    color="#7311d4"
                    style={{ marginLeft: currentlyPlaying === test.testNumber ? 0 : 2 }}
                  />
                </View>
              </View>
            </Pressable>
          ))}

          <View className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-2xl">
            <Text className="text-primary2 font-extrabold text-xs mb-1">📊 HOW TO USE</Text>
            <Text className="text-white/70 font-semibold text-xs">
              Play tests 1→4 in order. Note where robotic sound starts. Test 1 should sound most human.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

