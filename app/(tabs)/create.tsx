import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getAuth } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

// Components & Contexts
import ErrorDisplay from "@/components/ErrorDisplay";
import { useFirebase } from "@/components/FirebaseStore";
import LoadingScreen from "@/components/LoadingScreen";
import Screen from "@/components/Screen";
import SettingsModal, { StorySettings } from "@/components/SettingsModal";
import { COLORS } from "@/constants/colors";

type Mood = "Calm" | "Cozy" | "Romantic" | "Adventure";

export default function Create() {
  const { functions, user, db } = useFirebase();
  // removed useTheme()

  // --- State ---
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settings, setSettings] = useState<StorySettings>({
    storyLength: "standard",
    voiceKey: "gb_wavenet_d",
    goodNightMessage: "Sweet dreams, sleep tight ✨",
  });

  const [p1, setP1] = useState("Alex");
  const [p2, setP2] = useState("Jamie");
  const [mood, setMood] = useState<Mood>("Calm");
  const [tagText, setTagText] = useState("");
  const [tags, setTags] = useState<string[]>(["Stargazing", "Old books", "Ocean waves"]);

  // --- Real-time Credits ---
  useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setCredits(doc.data()?.credits || 0);
    });
    return () => unsub();
  }, [user, db]);

  // --- Logic Handlers ---
  const addTag = () => {
    const t = tagText.trim();
    if (!t || tags.includes(t) || tags.length >= 3) {
      setTagText("");
      return;
    }
    setTags([...tags, t]);
    setTagText("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleGenerateStory = async () => {
    if (loading || !functions) return;

    const auth = getAuth();
    if (!auth.currentUser) {
      setError("Please sign in to create stories.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createStory = httpsCallable(functions, "createStory");
      const res = await createStory({
        protagonist1: p1,
        protagonist2: p2,
        mood,
        tags,
        storyLength: settings.storyLength,
        voiceKey: settings.voiceKey,
        goodNightMessage: settings.goodNightMessage,
      });

      const data = res.data as any;
      if (data?.storyId) {
        router.replace({ pathname: "/(tabs)/sleep", params: { storyId: data.storyId } });
      } else {
        throw new Error("Story generation failed to return an ID.");
      }
    } catch (e: any) {
      setError(e.code === "functions/resource-exhausted"
        ? "The dream weaver is busy. Try again in 30 seconds."
        : e.message || "Failed to generate story.");
    } finally {
      setLoading(false);
    }
  };

  const moods: { key: Mood; icon: any; sub: string }[] = [
    { key: "Calm", icon: "moon-outline", sub: "Gentle & soothing" },
    { key: "Cozy", icon: "flame-outline", sub: "Warm & intimate" },
    { key: "Romantic", icon: "heart-outline", sub: "Love & connection" },
    { key: "Adventure", icon: "compass-outline", sub: "Soft exploration" },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 30, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* --- HEADER --- */}
          <View className="flex-row justify-between items-start mb-10">
            <View className="flex-1">
              <Text className="text-primary font-bold tracking-[3px] text-[10px] uppercase">
                Welcome, {user?.displayName?.split(' ')[0] || 'there'}
              </Text>
              <Text className="text-white text-4xl font-extrabold tracking-tight mt-1">
                Weave Your Tale
              </Text>
            </View>
            <Pressable
              onPress={() => setSettingsVisible(true)}
              className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-surface border border-border"
            >
              <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {/* --- SECTION: PROTAGONISTS --- */}
          <View className="mb-8">
            <Text className="text-primary font-bold tracking-[2px] text-[10px] uppercase mb-3 ml-1">
              The Characters
            </Text>
            <View className="bg-surface rounded-3xl border border-border overflow-hidden">
              <View className="flex-row items-center px-5 py-4 border-b border-border/40">
                <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                <TextInput
                  value={p1}
                  onChangeText={setP1}
                  placeholder="First Name"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  className="flex-1 text-white font-bold ml-4 text-base"
                />
              </View>
              <View className="flex-row items-center px-5 py-4">
                <Ionicons name="heart-outline" size={18} color={COLORS.primary} />
                <TextInput
                  value={p2}
                  onChangeText={setP2}
                  placeholder="Second Name"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  className="flex-1 text-white font-bold ml-4 text-base"
                />
              </View>
            </View>
          </View>

          {/* --- SECTION: INTERESTS --- */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-3 px-1">
              <Text className="text-primary font-bold tracking-[2px] text-[10px] uppercase">
                Shared Interests
              </Text>
              <Text className="text-faint text-[10px] font-bold">{tags.length}/3</Text>
            </View>
            <View className="bg-surface rounded-3xl border border-border p-5">
              <View className="flex-row flex-wrap gap-2 mb-3">
                {tags.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => removeTag(t)}
                    className="flex-row items-center bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5"
                  >
                    <Text className="text-primary text-xs font-bold mr-2">{t}</Text>
                    <Ionicons name="close-circle" size={14} color={COLORS.primary} />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={tagText}
                onChangeText={setTagText}
                onSubmitEditing={addTag}
                placeholder={tags.length < 3 ? "Add a spark (e.g. 'Stargazing')..." : "Limit reached"}
                editable={tags.length < 3}
                placeholderTextColor="rgba(255,255,255,0.2)"
                className="text-white font-bold py-1 text-base"
              />
            </View>
          </View>

          {/* --- SECTION: ATMOSPHERE --- */}
          <View className="mb-10">
            <Text className="text-primary font-bold tracking-[2px] text-[10px] uppercase mb-4 ml-1">
              Atmosphere
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {moods.map((m) => {
                const active = mood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMood(m.key)}
                    className={`w-[48%] rounded-2xl border p-5 mb-4 ${active ? "border-primary bg-primary" : "border-border bg-surface"
                      }`}
                  >
                    <Ionicons
                      name={m.icon}
                      size={22}
                      color={active ? COLORS.onPrimary : "rgba(255,255,255,0.4)"}
                    />
                    <Text
                      className="mt-4 text-base font-extrabold"
                      style={{ color: active ? COLORS.onPrimary : "white" }}
                    >
                      {m.key}
                    </Text>
                    <Text
                      className="text-[10px] font-semibold opacity-70"
                      style={{ color: active ? COLORS.onPrimary : "white" }}
                    >
                      {m.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* --- FOOTER & CTA --- */}
          <View className="items-center">
            <View className="flex-row items-center bg-surface px-4 py-2 rounded-full border border-border mb-6">
              <Ionicons name="sparkles" size={12} color={COLORS.primary} />
              <Text className="text-white/60 font-bold text-[10px] uppercase tracking-widest ml-2">
                {credits} {credits === 1 ? 'Credit' : 'Credits'} Remaining
              </Text>
            </View>

            <Pressable
              disabled={loading}
              onPress={handleGenerateStory}
              className={`w-full py-5 rounded-2xl items-center justify-center ${loading ? "bg-primary/50" : "bg-primary"
                }`}
            >
              <Text
                className="font-extrabold text-lg tracking-tight"
                style={{ color: COLORS.onPrimary }}
              >
                {loading ? "Dreaming..." : "Generate Narrative →"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- OVERLAYS --- */}
      {loading && <LoadingScreen credits={credits} />}

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {error && (
        <ErrorDisplay
          message={error}
          onDismiss={() => setError(null)}
        />
      )}
    </Screen>
  );
}