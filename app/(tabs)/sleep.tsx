import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ImageBackground, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/components/Screen";
import Logo from "@/components/Logo";
import { useLocalSearchParams } from "expo-router";
import { useFirebase } from "@/components/FirebaseStore";
import { doc, getDoc } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useBedtimeMode } from "@/components/BedtimeModeContext";
import BedtimeModeScreen from "@/components/BedtimeModeScreen";

// Ambient sound assets
const AMBIENT_SOUNDS = {
  Rain: require("@/assets/audio/rain.mp3"),
  Ocean: require("@/assets/audio/ocean.mp3"),
  Fire: require("@/assets/audio/fire.mp3"),
  Forest: require("@/assets/audio/forest.mp3"),
};

export default function Sleep() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { db, app } = useFirebase();
  const { isActive: bedtimeModeActive, activateBedtimeMode } = useBedtimeMode();

  const [story, setStory] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  // Mixer State
  const [ambience, setAmbience] = useState<"Rain" | "Ocean" | "Fire" | "Forest">("Rain");

  // Fetch Story and Audio URL
  useEffect(() => {
    async function fetchStory() {
      console.log("🔍 Sleep tab - checking for storyId:", storyId);
      if (!storyId || !db) {
        console.log("⚠️ Missing storyId or db:", { storyId, db: !!db });
        return;
      }
      setFetching(true);
      console.log("📥 Fetching story from Firestore:", storyId);
      try {
        const docRef = doc(db, "stories", storyId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Story fetched successfully:", {
            id: storyId,
            title: data.title,
            hasAudioPath: !!data.audioPath,
          });
          setStory(data);

          if (data.audioPath) {
            console.log("🎵 Fetching audio URL from storage:", data.audioPath);

            // DEBUG: Check auth state
            const auth = getAuth();
            console.log("🔐 Auth state when loading audio:", {
              currentUser: auth.currentUser?.uid,
              email: auth.currentUser?.email,
            });

            // Extract UID from audioPath for comparison
            const pathMatch = data.audioPath.match(/^audio\/([^\/]+)\//);
            const audioUid = pathMatch ? pathMatch[1] : "unknown";

            console.log("🔍 Permission check:", {
              "AUTH UID": auth.currentUser?.uid || "NOT AUTHENTICATED",
              "AUDIO UID (from path)": audioUid,
              "Match": auth.currentUser?.uid === audioUid ? "✅ YES" : "❌ NO - THIS WILL FAIL",
            });

            const storage = getStorage(app!);
            const audioRef = ref(storage, data.audioPath);
            const url = await getDownloadURL(audioRef);
            console.log("✅ Audio URL fetched:", url.substring(0, 50) + "...");
            setAudioUrl(url);
          } else {
            console.warn("⚠️ Story has no audioPath");
          }
        } else {
          console.error("❌ Story document not found in Firestore:", storyId);
          alert("Story not found.");
        }
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
      {(!story && !fetching) ? (
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

// Sub-component to handle Audio Hooks (which need a stable or valid source to init sometimes, 
// or at least we want to separate proper playback logic)
function StoryPlayer({
  story,
  audioUrl,
  ambience,
  setAmbience,
  loading
}: {
  story: any,
  audioUrl: string | null,
  ambience: "Rain" | "Ocean" | "Fire" | "Forest",
  setAmbience: (a: any) => void,
  loading: boolean
}) {
  const { isActive: bedtimeModeActive, sleepTimer, sleepTimerRemaining, setSleepTimer, updateTimerRemaining, activateBedtimeMode } = useBedtimeMode();

  // --- Story Audio Player ---
  const storyPlayer = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const storyStatus = useAudioPlayerStatus(storyPlayer);

  // --- Ambient Audio Player ---
  // Create a new player whenever ambience changes
  const ambientPlayer = useAudioPlayer(AMBIENT_SOUNDS[ambience]);

  useEffect(() => {
    if (ambientPlayer) {
      ambientPlayer.loop = true;
      ambientPlayer.volume = 0.3;
    }
  }, [ambientPlayer]);

  // When ambience changes, we need to stop the old player and start the new one
  useEffect(() => {
    if (!ambientPlayer) return;

    // Set up the new ambient player
    ambientPlayer.loop = true;
    ambientPlayer.volume = 0.3;

    // If story is currently playing, start the new ambient sound
    if (storyStatus.playing) {
      ambientPlayer.play();
    }

    // Cleanup function to stop the player when component unmounts or ambience changes
    return () => {
      if (ambientPlayer) {
        ambientPlayer.pause();
      }
    };
  }, [ambience, ambientPlayer]);

  // Sync Ambient with Story
  useEffect(() => {
    if (!storyPlayer || !ambientPlayer) return;

    // If story is playing, ensure ambient is playing
    if (storyStatus.playing && !ambientPlayer.playing) {
      ambientPlayer.play();
    }
    // If story is paused (and user paused it manually or it ended), pause ambient?
    else if (!storyStatus.playing && ambientPlayer.playing) {
      ambientPlayer.pause();
    }
  }, [storyStatus.playing, ambientPlayer, storyPlayer]);

  // Sleep Timer Countdown
  useEffect(() => {
    if (!sleepTimer || sleepTimerRemaining === null || sleepTimerRemaining <= 0) return;

    const interval = setInterval(() => {
      const newRemaining = sleepTimerRemaining - 1;
      updateTimerRemaining(newRemaining);

      if (newRemaining <= 0) {
        // Timer finished, start fade out
        handleTimerComplete();
      } else if (newRemaining <= 30) {
        // Last 30 seconds, start fading out story
        const fadeProgress = newRemaining / 30;
        if (storyPlayer) {
          storyPlayer.volume = fadeProgress;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer, sleepTimerRemaining]);

  const handleTimerComplete = () => {
    // Pause story
    if (storyPlayer) {
      storyPlayer.pause();
      storyPlayer.volume = 1; // Reset for next time
    }

    // Optionally continue ambient at low volume for 5 minutes
    if (ambientPlayer) {
      ambientPlayer.volume = 0.2;

      // Fade out ambient over final 2 minutes after 3 minutes
      setTimeout(() => {
        const ambientFadeInterval = setInterval(() => {
          if (ambientPlayer.volume > 0.05) {
            ambientPlayer.volume = Math.max(0, ambientPlayer.volume - 0.01);
          } else {
            ambientPlayer.pause();
            clearInterval(ambientFadeInterval);
          }
        }, 2400); // 2 minutes / 50 steps = 2400ms per step
      }, 180000); // 3 minutes
    }

    // Reset timer
    setSleepTimer(null);
  };

  // Helper for toggle
  const togglePlay = () => {
    if (storyStatus.playing) {
      storyPlayer.pause();
    } else {
      storyPlayer.play();
    }
  };

  const formatTime = (ms: number) => {
    if (!ms || ms < 0) return "0:00";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  const currentSeconds = storyStatus.currentTime;
  const totalSeconds = storyStatus.duration;
  const timeLeftSec = totalSeconds - currentSeconds;

  const formatSeconds = (s: number) => {
    if (!s || s < 0) return "0:00";
    const totalSec = Math.floor(s);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  const handleChangeSleepTimer = (minutes: number) => {
    setSleepTimer(minutes);
  };

  // If Bedtime Mode is active, show BedtimeModeScreen instead
  if (bedtimeModeActive) {
    return (
      <BedtimeModeScreen
        currentAudioTitle={story?.title || "Audio"}
        isPlaying={storyStatus.playing}
        onTogglePlay={togglePlay}
        onChangeSleepTimer={handleChangeSleepTimer}
      />
    );
  }

  // Regular Sleep tab UI
  return (
    <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 28 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <Logo size="small" glow={true} />

        <Pressable
          onPress={activateBedtimeMode}
          className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
          <Ionicons name="moon-outline" size={16} color="rgba(255,255,255,0.75)" />
          <Text className="text-white/75 font-extrabold">Bedtime Mode</Text>
        </Pressable>
      </View>

      {/* Greeting */}
      <Text className="text-white text-4xl font-extrabold mt-6">Sweet Dreams</Text>
      <Text className="text-muted mt-2 text-base font-semibold">
        {story ? "Now Playing" : "Loading story..."}
      </Text>

      {/* Player Card */}
      <View className="mt-5 rounded-3xl border border-border bg-surface overflow-hidden">
        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" }}
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
                  {!story ? "Fetching story..." :
                    storyStatus.isBuffering ? "Buffering audio..." :
                      (story.mood || "Story") + " Story"}
                </Text>
              </View>

              {loading || !audioUrl ? (
                <View className="h-16 w-16 rounded-full bg-white/20 items-center justify-center">
                  <ActivityIndicator color="white" />
                </View>
              ) : (
                <Pressable onPress={togglePlay} className="h-16 w-16 rounded-full bg-white items-center justify-center">
                  <Ionicons name={storyStatus.playing ? "pause" : "play"} size={28} color="#7311d4" style={{ marginLeft: storyStatus.playing ? 0 : 2 }} />
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
          <Text className="text-primary2 font-extrabold">Mixer settings</Text>
        </View>

        <View className="mt-3 flex-row justify-between">
          {(["Rain", "Ocean", "Fire", "Forest"] as const).map((s) => {
            const active = ambience === s;
            const icon =
              s === "Rain" ? "water-outline" : s === "Ocean" ? "pulse-outline" : s === "Fire" ? "flame-outline" : "leaf-outline";

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
