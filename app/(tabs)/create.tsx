import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/components/Screen";
import LoadingScreen from "@/components/LoadingScreen";
import SettingsModal, { StorySettings } from "@/components/SettingsModal";
import Logo from "@/components/Logo";
import ErrorDisplay from "@/components/ErrorDisplay";

import { router } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { useFirebase } from "@/components/FirebaseStore";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type Mood = "Calm" | "Cozy" | "Romantic" | "Adventure";

export default function Create() {
  const { functions, user, db } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settings, setSettings] = useState<StorySettings>({
    storyLength: "standard",
    voiceKey: "gb_wavenet_d",
    goodNightMessage: "Sweet dreams, sleep tight ✨",
  });

  // Fetch real-time credits
  React.useEffect(() => {
    if (!user || !db) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      setCredits(doc.data()?.credits || 0);
    });
    return () => unsub();
  }, [user, db]);

  const [p1, setP1] = useState("Alex");
  const [p2, setP2] = useState("Jamie");
  const [mood, setMood] = useState<Mood>("Calm");
  const [tagText, setTagText] = useState("");
  const [tags, setTags] = useState<string[]>(["Stargazing", "Old books", "Ocean waves"]);

  const addTag = () => {
    const t = tagText.trim();
    if (!t) return;
    if (tags.includes(t)) return setTagText("");
    if (tags.length >= 3) return;
    setTags([...tags, t]);
    setTagText("");
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const moods: { key: Mood; icon: any; sub: string }[] = [
    { key: "Calm", icon: "moon-outline", sub: "Gentle & soothing" },
    { key: "Cozy", icon: "flame-outline", sub: "Warm & intimate" },
    { key: "Romantic", icon: "heart-outline", sub: "Love & connection" },
    { key: "Adventure", icon: "compass-outline", sub: "Soft exploration" },
  ];

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 28 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <Logo size="small" />

          <Text className="text-white text-xl font-extrabold">Weave Your Tale</Text>

          <Pressable onPress={() => setSettingsVisible(true)} className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface">
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>

        <Text className="text-muted text-center mt-3 leading-5">
          Begin your journey to dreamland. Tell us a little about the two of you to create a personalized narrative.
        </Text>

        {/* Inputs */}
        <View className="mt-6 gap-4">
          <View>
            <Text className="text-primary font-extrabold tracking-widest text-xs">PROTAGONIST 1</Text>
            <View className="mt-2 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
              <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.35)" />
              <TextInput
                value={p1}
                onChangeText={setP1}
                placeholder="Name"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="flex-1 text-white font-bold"
              />
            </View>
          </View>

          <View>
            <Text className="text-primary font-extrabold tracking-widest text-xs">PROTAGONIST 2</Text>
            <View className="mt-2 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4">
              <Ionicons name="heart-outline" size={18} color="rgba(255,255,255,0.35)" />
              <TextInput
                value={p2}
                onChangeText={setP2}
                placeholder="Name"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="flex-1 text-white font-bold"
              />
            </View>
          </View>
        </View>

        {/* Tags */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-primary font-extrabold tracking-widest text-xs">3 SHARED INTERESTS</Text>
            <Text className="text-faint font-bold text-xs">{tags.length}/3 added</Text>
          </View>

          <View className="mt-3 rounded-3xl border border-border bg-surface p-4">
            <View className="flex-row flex-wrap gap-2">
              {tags.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => removeTag(t)}
                  className="flex-row items-center gap-2 rounded-2xl border border-primary/30 bg-primary/20 px-3 py-2"
                >
                  <Ionicons name="sparkles-outline" size={14} color="#8e2de2" />
                  <Text className="text-white font-extrabold">{t}</Text>
                  <Ionicons name="close" size={14} color="rgba(255,255,255,0.55)" />
                </Pressable>
              ))}
            </View>

            <TextInput
              value={tagText}
              onChangeText={setTagText}
              onSubmitEditing={addTag}
              placeholder="Type and press enter…"
              placeholderTextColor="rgba(255,255,255,0.25)"
              className="mt-3 text-white font-bold"
            />
          </View>

          <Text className="text-white/25 text-xs mt-2">
            Type and press enter to add tags like “Rain”, “Tea”, etc.
          </Text>
        </View>

        {/* Mood grid */}
        <View className="mt-6">
          <Text className="text-primary font-extrabold tracking-widest text-xs">SELECT MOOD</Text>

          <View className="mt-3 flex-row flex-wrap justify-between">
            {moods.map((m) => {
              const active = mood === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMood(m.key)}
                  className={[
                    "w-[48%] rounded-2xl border p-4 mb-3",
                    active ? "border-primary/70 bg-primary/15" : "border-border bg-surface",
                  ].join(" ")}
                >
                  <View className="flex-row items-center justify-between">
                    <Ionicons name={m.icon} size={24} color={active ? "#8e2de2" : "rgba(255,255,255,0.55)"} />
                    <View className={["h-5 w-5 rounded-full border items-center justify-center",
                      active ? "border-primary/80 bg-primary/40" : "border-white/25"
                    ].join(" ")}>
                      {active ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
                    </View>
                  </View>

                  <Text className={["mt-3 text-base font-extrabold", active ? "text-white" : "text-white/80"].join(" ")}>
                    {m.key}
                  </Text>
                  <Text className="mt-1 text-white/45 font-semibold text-xs">{m.sub}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Credits + CTA */}
        <View className="mt-2 items-center">
          <View className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
            <Ionicons name="sparkles" size={14} color="#8e2de2" />
            <Text className="text-white/70 font-bold text-xs">{credits} {credits === 1 ? 'Credit' : 'Credits'} Remaining</Text>
          </View>
        </View>

        <Pressable
          disabled={loading}
          onPress={async () => {
            if (!functions) {
              console.error("❌ Firebase Functions not initialized");
              setError("Firebase Functions not initialized. Check console.");
              return;
            }

            // Log authentication state
            const auth = getAuth();
            console.log("🔐 Auth state:", {
              currentUser: auth.currentUser?.uid,
              email: auth.currentUser?.email,
            });

            if (!auth.currentUser) {
              console.error("❌ User not authenticated");
              setError("Please sign in to create stories.");
              return;
            }

            console.log("🚀 Starting story creation...");
            setLoading(true);
            setError(null); // Clear any previous errors
            try {
              const createStory = httpsCallable(functions, "createStory");
              console.log("📤 Calling createStory with params:", {
                protagonist1: p1,
                protagonist2: p2,
                mood,
                tags,
                storyLength: settings.storyLength,
                voiceKey: settings.voiceKey,
              });

              const res = await createStory({
                protagonist1: p1,
                protagonist2: p2,
                mood,
                tags,
                storyLength: settings.storyLength,
                voiceKey: settings.voiceKey,
                goodNightMessage: settings.goodNightMessage,
              });

              console.log("✅ Full Cloud function response:", res);
              console.log("📦 Response data:", res.data);

              // Guard: validate response structure
              if (!res?.data) {
                console.error("❌ createStory returned no data:", res);
                throw new Error("createStory did not return data");
              }

              const data = res.data as any;

              if (!data.storyId) {
                console.error("❌ createStory did not return storyId:", data);
                throw new Error("createStory did not return storyId");
              }

              if (!data.audioPath) {
                console.warn("⚠️ No audioPath in response:", data);
              }

              console.log("🧭 Navigating to sleep tab with storyId:", data.storyId);
              console.log("🔊 Audio path:", data.audioPath);

              // Navigate to player with new story
              router.replace({ pathname: "/(tabs)/sleep", params: { storyId: data.storyId } });
            } catch (e: any) {
              console.error("❌ Error creating story:", e);
              console.error("Error details:", {
                message: e.message,
                code: e.code,
                details: e.details,
                stack: e.stack,
              });
              setError(e.message || "Failed to generate story. Please try again.");
            } finally {
              setLoading(false);
              console.log("✅ Story creation flow completed");
            }
          }}
          className="mt-4 rounded-2xl overflow-hidden"
        >
          <View className={["px-5 py-4 items-center rounded-2xl", loading ? "bg-primary/50" : "bg-primary"].join(" ")}>
            <Text className="text-white font-extrabold text-lg">
              {loading ? "Dreaming... (may take 20s)" : "Generate Story →"}
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Loading Screen Overlay */}
      {loading && <LoadingScreen credits={credits} />}

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* Error Display */}
      {error && <ErrorDisplay message={error} onDismiss={() => setError(null)} />}
    </Screen>
  );
}
