import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, Text, View } from "react-native";

import { useBedtimeMode } from "@/components/BedtimeModeContext";
import BedtimeModeScreen from "@/components/BedtimeModeScreen";
import { useFirebase } from "@/components/FirebaseStore";
import Logo from "@/components/Logo";
import Screen from "@/components/Screen";

import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

// Ambient sound assets
const AMBIENT_SOUNDS = {
  Rain: require("@/assets/audio/rain.mp3"),
  Ocean: require("@/assets/audio/ocean.mp3"),
  Fire: require("@/assets/audio/fire.mp3"),
  Forest: require("@/assets/audio/forest.mp3"),
} as const;

type AmbienceKey = keyof typeof AMBIENT_SOUNDS;

export default function Sleep() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { db, app } = useFirebase();

  const [story, setStory] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  // Mixer state
  const [ambience, setAmbience] = useState<AmbienceKey>("Rain");

  useEffect(() => {
    async function fetchStory() {
      console.log("🔍 Sleep tab - checking for storyId:", storyId);

      if (!storyId || !db) {
        console.log("⚠️ Missing storyId or db:", { storyId, db: !!db });
        setFetching(false);
        return;
      }

      setFetching(true);
      console.log("📥 Fetching story from Firestore:", storyId);

      try {
        const docRef = doc(db, "stories", storyId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          console.error("❌ Story document not found in Firestore:", storyId);
          alert("Story not found.");
          setStory(null);
          setAudioUrl(null);
          return;
        }

        const data = snap.data();
        console.log("✅ Story fetched successfully:", {
          id: storyId,
          title: data.title,
          hasAudioPath: !!data.audioPath,
        });

        setStory(data);

        if (!data.audioPath) {
          console.warn("⚠️ Story has no audioPath");
          setAudioUrl(null);
          return;
        }

        console.log("🎵 Fetching audio URL from storage:", data.audioPath);

        // DEBUG: auth state
        const auth = getAuth();
        console.log("🔐 Auth state when loading audio:", {
          currentUser: auth.currentUser?.uid,
          email: auth.currentUser?.email,
        });

        // Extract UID from audioPath for comparison
        const pathMatch = String(data.audioPath).match(/^audio\/([^\/]+)\//);
        const audioUid = pathMatch ? pathMatch[1] : "unknown";

        console.log("🔍 Permission check:", {
          "AUTH UID": auth.currentUser?.uid || "NOT AUTHENTICATED",
          "AUDIO UID (from path)": audioUid,
          Match: auth.currentUser?.uid === audioUid ? "✅ YES" : "❌ NO - THIS WILL FAIL",
        });

        const storage = getStorage(app!);
        const audioRef = ref(storage, data.audioPath);
        const url = await getDownloadURL(audioRef);

        console.log("✅ Audio URL fetched:", url.substring(0, 60) + "...");
        setAudioUrl(url);
      } catch (e: any) {
        console.error("❌ Failed to load story:", e);
        console.error("Error details:", {
          message: e.message,
          code: e.code,
          stack: e.stack,
        });
        alert("Load Error: " + (e.message || "Unknown error"));
      } finally {
        setFetching(false);
        console.log("✅ Story fetch completed");
      }
    }

    fetchStory();
  }, [db, storyId, app]);

  return (
    <Screen>
      {!story && !fetching ? (
        <View className="flex-1 items-center justify-center p-5">
          <Text className="text-white font-bold text-center">Select a story from your library.</Text>
        </View>
      ) : (
        <StoryPlayer
          story={story}
          audioUrl={audioUrl}
          ambience={ambience}
          setAmbience={setAmbience}
          loading={fetching}
        />
      )}
    </Screen>
  );
}

function StoryPlayer({
  story,
  audioUrl,
  ambience,
  setAmbience,
  loading,
}: {
  story: any;
  audioUrl: string | null;
  ambience: AmbienceKey;
  setAmbience: (a: AmbienceKey) => void;
  loading: boolean;
}) {
  const {
    isActive: bedtimeModeActive,
    sleepTimer,
    sleepTimerRemaining,
    setSleepTimer,
    updateTimerRemaining,
    activateBedtimeMode,
  } = useBedtimeMode();

  // iOS audio mode config (kept as you had it)
  useEffect(() => {
    const configureAudioMode = async () => {
      try {
        const { Audio } = await import("expo-av");
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
        console.log("✅ Audio mode configured");
      } catch (err) {
        console.warn("Could not set audio mode:", err);
      }
    };
    configureAudioMode();
  }, []);

  // --- Story Audio Player ---
  const storySource = useMemo(() => (audioUrl ? { uri: audioUrl } : null), [audioUrl]);
  const storyPlayer = useAudioPlayer(storySource);
  const storyStatus = useAudioPlayerStatus(storyPlayer);

  // --- Ambient Audio Player ---
  const ambientSource = useMemo(() => AMBIENT_SOUNDS[ambience], [ambience]);
  const ambientPlayer = useAudioPlayer(ambientSource);
  const ambientStatus = useAudioPlayerStatus(ambientPlayer);

  // Configure ambient player defaults
  useEffect(() => {
    if (!ambientPlayer) return;
    ambientPlayer.loop = true;
    ambientPlayer.volume = 0.3;
  }, [ambientPlayer]);

  // When ambience changes, stop previous instance (cleanup) and start new one if story is playing
  useEffect(() => {
    if (!ambientPlayer) return;

    console.log(`🎛️ Ambience set to: ${ambience}`);

    // Start ambience only when story is playing (your original behavior)
    if (storyStatus.playing) {
      console.log(`▶️ Starting ambience: ${ambience} (story playing)`);
      ambientPlayer.play();
    } else {
      console.log(`⏸️ Not starting ambience: ${ambience} (story paused)`);
      ambientPlayer.pause();
    }

    return () => {
      // Cleanup old ambience when switching
      try {
        ambientPlayer.pause();
        ambientPlayer.currentTime = 0; // optional reset
      } catch { }
    };
  }, [ambience, ambientPlayer, storyStatus.playing]);

  // Keep ambience synced to story playback using *status hooks*
  useEffect(() => {
    if (!ambientPlayer) return;

    if (storyStatus.playing && !ambientStatus.playing) {
      ambientPlayer.play();
    } else if (!storyStatus.playing && ambientStatus.playing) {
      ambientPlayer.pause();
    }
  }, [storyStatus.playing, ambientStatus.playing, ambientPlayer]);

  // Sleep Timer Countdown
  useEffect(() => {
    if (!sleepTimer || sleepTimerRemaining == null || sleepTimerRemaining <= 0) return;

    const interval = setInterval(() => {
      const newRemaining = sleepTimerRemaining - 1;
      updateTimerRemaining(newRemaining);

      if (newRemaining <= 0) {
        handleTimerComplete();
      } else if (newRemaining <= 30) {
        const fadeProgress = newRemaining / 30;
        try {
          if (storyPlayer) storyPlayer.volume = fadeProgress;
        } catch { }
      }
    }, 1000);

    return () => clearInterval(interval);
    // IMPORTANT: keep same deps pattern you had (timerRemaining drives this)
  }, [sleepTimer, sleepTimerRemaining]);

  const handleTimerComplete = () => {
    try {
      if (storyPlayer) {
        storyPlayer.pause();
        storyPlayer.volume = 1;
      }
    } catch { }

    // Optional: continue ambience briefly then fade out
    try {
      if (ambientPlayer) {
        ambientPlayer.volume = 0.2;

        setTimeout(() => {
          const ambientFadeInterval = setInterval(() => {
            try {
              if (ambientPlayer.volume > 0.05) {
                ambientPlayer.volume = Math.max(0, ambientPlayer.volume - 0.01);
              } else {
                ambientPlayer.pause();
                clearInterval(ambientFadeInterval);
              }
            } catch {
              clearInterval(ambientFadeInterval);
            }
          }, 2400);
        }, 180000);
      }
    } catch { }

    setSleepTimer(null);
  };

  // Helpers
  const togglePlay = () => {
    if (!storyPlayer) return;
    if (storyStatus.playing) storyPlayer.pause();
    else storyPlayer.play();
  };

  const formatSeconds = (s: number) => {
    if (!s || s < 0) return "0:00";
    const totalSec = Math.floor(s);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  const currentSeconds = storyStatus.currentTime || 0;
  const totalSeconds = storyStatus.duration || 0;
  const timeLeftSec = Math.max(0, totalSeconds - currentSeconds);

  const handleChangeSleepTimer = (minutes: number) => {
    setSleepTimer(minutes);
  };

  if (bedtimeModeActive) {
    return (
      <BedtimeModeScreen
        currentAudioTitle={story?.title || "Audio"}
        isPlaying={!!storyStatus.playing}
        onTogglePlay={togglePlay}
        onChangeSleepTimer={handleChangeSleepTimer}
      />
    );
  }

  return (
    <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Logo size="small" glow={true} />
        <Pressable
          onPress={activateBedtimeMode}
          className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 py-2"
        >
          <Ionicons name="moon-outline" size={16} color="rgba(255,255,255,0.75)" />
          <Text className="text-white/75 font-extrabold">Bedtime Mode</Text>
        </Pressable>
      </View>

      {/* Greeting */}
      <Text className="text-white text-4xl font-extrabold mt-6">Sweet Dreams</Text>
      <Text className="text-muted mt-2 text-base font-semibold">{story ? "Now Playing" : "Loading story..."}</Text>

      {/* Player Card */}
      <View className="mt-5 rounded-3xl border border-border bg-surface overflow-hidden">
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
          }}
          style={{ height: 320 }}
        >
          <View className="absolute inset-0 bg-black/45" />
          <View className="flex-1 p-5 justify-end">
            <View className="flex-row items-center gap-3">
              <View className="bg-primary/70 px-3 py-2 rounded-xl">
                <Text className="text-white font-extrabold text-xs">{storyStatus.playing ? "NOW PLAYING" : "PAUSED"}</Text>
              </View>
              <Text className="text-white/70 font-bold">• {formatSeconds(timeLeftSec)} left</Text>
            </View>

            {/* Playback Control */}
            <View className="flex-row items-end justify-between mt-3">
              <View className="flex-1 pr-3">
                <Text className="text-white text-3xl font-extrabold" numberOfLines={1}>
                  {story?.title || "Loading..."}
                </Text>
                <Text className="text-white/65 font-bold mt-1" numberOfLines={1}>
                  {!story
                    ? "Fetching story..."
                    : storyStatus.isBuffering
                      ? "Buffering audio..."
                      : (story.mood || "Story") + " Story"}
                </Text>
              </View>

              {loading || !audioUrl ? (
                <View className="h-16 w-16 rounded-full bg-white/20 items-center justify-center">
                  <ActivityIndicator color="white" />
                </View>
              ) : (
                <Pressable onPress={togglePlay} className="h-16 w-16 rounded-full bg-white items-center justify-center">
                  <Ionicons
                    name={storyStatus.playing ? "pause" : "play"}
                    size={28}
                    color="#7311d4"
                    style={{ marginLeft: storyStatus.playing ? 0 : 2 }}
                  />
                </Pressable>
              )}
            </View>

            {/* Progress */}
            <View className="mt-4 h-2 rounded-full bg-white/20 overflow-hidden">
              <View
                style={{ width: `${totalSeconds ? (currentSeconds / totalSeconds) * 100 : 0}%` }}
                className="h-2 bg-primary rounded-full"
              />
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* Soundscape */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-extrabold">Soundscape</Text>
          <Text className="text-primary2 font-extrabold">
            {ambientStatus.playing ? "Playing" : "Ready"}
          </Text>
        </View>

        <View className="mt-3 flex-row justify-between">
          {(["Rain", "Ocean", "Fire", "Forest"] as const).map((s) => {
            const active = ambience === s;
            const icon =
              s === "Rain"
                ? "water-outline"
                : s === "Ocean"
                  ? "pulse-outline"
                  : s === "Fire"
                    ? "flame-outline"
                    : "leaf-outline";

            return (
              <Pressable
                key={s}
                onPress={() => setAmbience(s)}
                className={[
                  "w-[23%] rounded-2xl border p-4 items-center",
                  active ? "border-primary/70 bg-primary/15" : "border-border bg-surface",
                ].join(" ")}
              >
                <Ionicons name={icon as any} size={22} color={active ? "#8e2de2" : "rgba(255,255,255,0.55)"} />
                <Text className={["mt-3 font-extrabold text-sm", active ? "text-primary2" : "text-white/45"].join(" ")}>
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
