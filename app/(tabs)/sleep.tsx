import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useAudioPlayer } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View
} from "react-native";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, query, where } from "firebase/firestore";

import { useBedtimeMode } from "@/components/BedtimeModeContext";
import BedtimeModeScreen from "@/components/BedtimeModeScreen";
import { useFirebase } from "@/components/FirebaseStore";
import Screen from "@/components/Screen";
import { COLORS } from "@/constants/colors";
import { useAudioQueue } from "@/components/AudioQueueProvider";

const AMBIENT_SOUNDS = {
  Rain: require("@/assets/audio/rain.mp3"),
  Ocean: require("@/assets/audio/ocean.mp3"),
  Fire: require("@/assets/audio/fire.mp3"),
  Forest: require("@/assets/audio/forest.mp3"),
} as const;

type AmbienceKey = keyof typeof AMBIENT_SOUNDS;

export default function Sleep() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { db } = useFirebase();
  const [initialQueue, setInitialQueue] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Fetch story + a few others for the queue
  useEffect(() => {
    let unsubStory: (() => void) | undefined;

    async function fetchQueue() {
      if (!db) { setFetching(false); return; }
      setFetching(true);

      try {
        const queue: any[] = [];

        // 1. Real-time listener for current story (to detect status change)
        if (storyId) {
          const docRef = doc(db, "stories", storyId);
          unsubStory = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();

              // Helper to merge into queue
              setInitialQueue((prevQueue) => {
                const newQueue = [...prevQueue];
                // Should be first item if it matches
                if (newQueue.length > 0 && newQueue[0].id === storyId) {
                  newQueue[0] = { id: snap.id, ...data };
                } else if (newQueue.length === 0) {
                  newQueue.push({ id: snap.id, ...data });
                } else {
                  // If not found (shouldn't happen often if we init), unshift
                  newQueue.unshift({ id: snap.id, ...data });
                }
                return newQueue;
              });

              // Stop loading only if we have data (status check handled in UI)
              setFetching(false);
            }
          });
        }

        // 2. Fetch a couple more for the "Queue" (exclude current if possible)
        // This remains a one-time fetch for recommendations
        const q = query(collection(db, "stories"), limit(3));
        const snap = await getDocs(q);
        const recommendations: any[] = [];
        snap.forEach((d) => {
          if (d.id !== storyId) recommendations.push({ id: d.id, ...d.data() });
        });

        // We set initial queue with recommendations temporarily, 
        // listener will inject the main story.
        setInitialQueue((prev) => {
          // Avoid duplicates if listener fired fast
          const mainStory = prev.find(s => s.id === storyId);
          return mainStory ? [mainStory, ...recommendations] : [...recommendations];
        });

        // 3. COMPLETE LOADING (If we are not waiting for a specific story doc)
        // If storyId exists, the onSnapshot above will handle setFetching(false) when data arrives.
        // If storyId is MISSING, we must stop loading here so the "Choose a journey" screen appears.
        if (!storyId) {
          setFetching(false);
        }

      } catch (e) {
        console.error("❌ Error fetching stories:", e);
        setFetching(false);
      }
    }

    fetchQueue();
    return () => {
      if (unsubStory) unsubStory();
    };
  }, [db, storyId]);

  return (
    <Screen>
      {!fetching && initialQueue.length === 0 ? (
        <View className="flex-1 items-center justify-center p-10">
          <Ionicons name="moon-outline" size={48} color="rgba(255,255,255,0.1)" />
          <Text className="text-white/40 font-bold text-center mt-4">Choose a journey to begin.</Text>
        </View>
      ) : (
        <StoryPlayer
          initialQueue={initialQueue}
          loading={fetching}
        />
      )}
    </Screen>
  );
}

function StoryPlayer({ initialQueue, loading }: any) {
  // 1. ALL HOOKS MUST COME FIRST
  const { user } = useFirebase();
  const { isActive: bedtimeModeActive, activateBedtimeMode, setSleepTimer } = useBedtimeMode();
  const [mixerModalVisible, setMixerModalVisible] = React.useState(false);
  const audioQueue = useAudioQueue(); // Must be called unconditionally

  // Ambient Players
  const ambientPlayers = {
    Rain: useAudioPlayer(AMBIENT_SOUNDS.Rain),
    Ocean: useAudioPlayer(AMBIENT_SOUNDS.Ocean),
    Fire: useAudioPlayer(AMBIENT_SOUNDS.Fire),
    Forest: useAudioPlayer(AMBIENT_SOUNDS.Forest),
  };

  const [ambience, setAmbience] = useState<AmbienceKey>("Rain");
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  // Slider State
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);

  // 2. SAFE DESTRUCTURE (Hooks depend on these values)
  // If audioQueue is null (shouldn't be, but safety first), use empty object
  const {
    playQueue,
    currentStory,
    phase,
    currentIndex,
    pauseQueue,
    resumeQueue,
    currentTime,
    duration,
    storyVolume,
    setStoryVolume,
    brownNoiseVolume,
    queue,
    isPlaying: isAudioPlaying
  } = audioQueue || {};

  // 3. EFFECTS (Must be unconditional, rely on safe destructure)
  // Initialize Queue Only Once when data is ready
  useEffect(() => {
    if (!playQueue || !initialQueue || initialQueue.length === 0) return;

    // Check if we need to switch the queue
    // Condition 1: Queue is empty -> Load and DO NOT auto-play (App Launch)
    // Condition 2: Queue has items, but the first item ID is different -> Load and AUTO-PLAY (User selection)
    const currentId = queue?.[0]?.id;
    const initialId = initialQueue[0]?.id;

    if (!queue || queue.length === 0) {
      // App launch / Empty state
      console.log("[StoryPlayer] Initializing queue from launch (AutoPlay OFF)");
      playQueue(initialQueue, 0, false);
    } else if (currentId !== initialId) {
      // User explicitly selected a new story (different from what's potentially playing)
      console.log("[StoryPlayer] Switching queue from vault (AutoPlay ON)");
      playQueue(initialQueue, 0, true);
    }
    // Else: Same queue, do nothing (preserve state)
  }, [initialQueue, queue, playQueue]);

  // Refined Ambient Fader Effect (Optional - if we want true fading)
  // We can use a single interval to approach target volumes
  // Refined Ambient Fader Effect
  useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(ambientPlayers).forEach(([key, player]) => {
        if (!player) return;

        const isActive = key === ambience;
        // Logic:
        // 1. INTRO: Fade In (Start with next story)
        // 2. PLAYING: Maintain Volume
        // 3. OUTRO: Fade Out (With the story)
        // 4. BRIDGE: Remain Silent
        // 5. PAUSED: Fade Out
        const isFlowPhase = phase === 'PLAYING' || phase === 'INTRO';
        const shouldPlay = isActive && ambientEnabled && isFlowPhase && isAudioPlaying;

        let target = 0;
        if (shouldPlay) {
          target = ambientVolume;
        }

        // Move current volume towards target
        const current = player.volume;
        const step = 0.02; // 0.02 per 50ms = 0.4 per second (approx 2.5s fade)

        let next = current;
        if (Math.abs(current - target) < step) {
          next = target;
        } else if (current < target) {
          next = current + step;
        } else {
          next = current - step;
        }

        if (next !== current) {
          player.volume = next;
        }

        // Handle Play/Pause State
        // Play if we have volume and intention
        if (target > 0 && next > 0 && !player.playing) {
          player.play();
          player.loop = true; // Ensure loop is set
        }
        // Pause ONLY when fully silent to allow tail fade out
        if (next === 0 && player.playing) {
          player.pause();
        }
      });
    }, 50); // 20Hz update (Smooth)
    return () => clearInterval(interval);
  }, [ambience, ambientEnabled, ambientVolume, phase, isAudioPlaying]); // Dependencies to keep interval fresh with latest state refs


  // 4. CONDITIONAL RENDERS (Only after ALL hooks)
  if (!audioQueue || loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Derived state for UI labels (Safe to use derived values here)
  const isPhaseActive = phase === 'PLAYING' || phase === 'OUTRO' || phase === 'INTRO';
  const isBridging = phase === 'BRIDGE';

  const togglePlay = () => {
    if (!audioQueue) return;
    if (isAudioPlaying) pauseQueue();
    else resumeQueue();
  };

  const formatSeconds = (s: number) => {
    const totalSec = Math.floor(s || 0);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  // --- RENDER ---

  if (bedtimeModeActive) {
    // Bedtime Mode View
    return (
      <BedtimeModeScreen
        currentAudioTitle={isBridging ? "Drifting..." : (currentStory?.title || "Audio")}
        isPlaying={isAudioPlaying || isBridging}
        onTogglePlay={togglePlay}
        onChangeSleepTimer={(m: number) => setSleepTimer(m)}
      />
    );
  }

  // Normal View
  return (
    <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 30, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* --- HEADER --- */}
      <View className="flex-row justify-between items-start mb-8">
        <View className="flex-1">
          <Text className="text-primary font-bold tracking-[3px] text-[10px] uppercase">Welcome, {user?.displayName?.split(' ')[0] || 'Dreamer'}</Text>
          <Text className="text-white text-4xl font-extrabold tracking-tight mt-1">Sweet Dreams</Text>
        </View>
        <Pressable onPress={activateBedtimeMode} className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-surface border border-border">
          <Ionicons name="moon-outline" size={20} color={COLORS.primary} />
        </Pressable>
      </View>

      {/* --- PLAYER CARD --- */}
      <View className="rounded-[32px] border border-border bg-surface overflow-hidden mb-10 shadow-2xl">
        <ImageBackground source={{ uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" }} style={{ height: 320 }}>
          <View className="absolute inset-0 bg-black/40" />
          <View className="flex-1 p-6 justify-end">
            <View className="flex-row items-center justify-between mb-4">
              <View className="bg-primary px-3 py-1 rounded-full">
                <Text className="text-black font-bold text-[10px] tracking-widest uppercase">
                  {isBridging ? "Bridging (Safety Net)" : isAudioPlaying ? "Flowing" : "Paused"}
                </Text>
              </View>
              {!isBridging && (
                <Text className="text-white font-bold text-xs">{formatSeconds((duration || 0) - (currentTime || 0))} left</Text>
              )}
            </View>
            <View className="flex-1 mr-4">
              <Text className="text-white text-3xl font-extrabold tracking-tight" numberOfLines={1}>
                {isBridging ? "Drifting..." : (currentStory?.title || "Loading...")}
              </Text>
              <Text className="text-white/60 font-bold text-sm mt-1 uppercase tracking-tighter">
                {isBridging ? "Resting" : (currentStory?.status === "processing_audio" ? "Weaving Audio..." : (currentStory?.mood || "Deep") + " Narrative")}
              </Text>
            </View>
            <Pressable
              onPress={togglePlay}
              disabled={loading || currentStory?.status === "processing_audio"}
              className={`h-16 w-16 rounded-full items-center justify-center ${isBridging ? "bg-black/40 border border-[#fdfbd4]" :
                (currentStory?.status === "processing_audio" ? "bg-white/10" : "bg-primary")
                }`}
            >
              {loading || currentStory?.status === "processing_audio" ? <ActivityIndicator color={currentStory?.status === "processing_audio" ? "white" : "black"} /> : (
                <Ionicons
                  name={isBridging ? "moon" : (isAudioPlaying ? "pause" : "play")}
                  size={28}
                  color={isBridging ? "#fdfbd4" : "black"}
                  style={{ marginLeft: (isAudioPlaying || isBridging) ? 0 : 4 }}
                />
              )}
            </Pressable>
          </View>

          {/* Progress Slider */}
          {!isBridging && (
            <View className="mt-4">
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={duration || 1}
                value={isDragging ? dragValue : (currentTime || 0)}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={COLORS.primary}
                onSlidingStart={() => {
                  setIsDragging(true);
                  setDragValue(currentTime || 0);
                }}
                onValueChange={(v) => setDragValue(v)}
                onSlidingComplete={(v) => {
                  if (audioQueue?.seekTo) {
                    audioQueue.seekTo(v);
                  }
                  setIsDragging(false);
                }}
              />
            </View>
          )}
          {/* Bridge Indicator */}
          {isBridging && (
            <View className="mt-6 h-1 rounded-full bg-white/20 overflow-hidden">
              <View style={{ width: '100%' }} className="h-full bg-primary/50" />
            </View>
          )}
        </ImageBackground>
      </View>

      {/* --- DEBUG INFO (Using Brown Noise) --- */}
      <View className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <Text className="text-white/60 text-xs font-mono">Phase: {phase}</Text>
        <Text className="text-white/60 text-xs font-mono">Story Vol: {storyVolume?.toFixed(2) || "0.00"}</Text>
        <Text className="text-white/60 text-xs font-mono">Brown Noise Vol: {brownNoiseVolume?.toFixed(2) || "0.00"}</Text>
      </View >

      {/* --- SOUNDSCAPE MASTER SWITCH --- */}
      < View className="mb-6" >
        <Text className="text-primary font-bold tracking-[2px] text-[10px] uppercase mb-3 ml-1">Soundscape</Text>
        <Pressable
          onPress={() => setAmbientEnabled(!ambientEnabled)}
          className={`flex-row items-center justify-between p-5 rounded-3xl border ${ambientEnabled ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
        >
          <View className="flex-row items-center">
            <View className={`h-10 w-10 rounded-full items-center justify-center ${ambientEnabled ? 'bg-black/10' : 'bg-primary/10'}`}>
              <Ionicons name="sparkles-outline" size={20} color={ambientEnabled ? "black" : COLORS.primary} />
            </View>
            <Text className={`font-bold text-base ml-4 ${ambientEnabled ? 'text-black' : 'text-white'}`}>Ambient Audio</Text>
          </View>
          <Switch
            value={ambientEnabled}
            onValueChange={setAmbientEnabled}
            trackColor={{ false: "#222", true: "rgba(0,0,0,0.1)" }}
            thumbColor={ambientEnabled ? "white" : "#444"}
          />
        </Pressable>
      </View >

      {/* --- REFINED AMBIENT OPTIONS GRID (SMALLER BUTTONS) --- */}
      {
        ambientEnabled && (
          <View className="mb-6">
            <View className="flex-row flex-wrap justify-between">
              {(["Rain", "Ocean", "Fire", "Forest"] as const).map((s) => {
                const active = ambience === s;
                const icons = { Rain: "water-outline", Ocean: "pulse-outline", Fire: "flame-outline", Forest: "leaf-outline" };
                return (
                  <Pressable
                    key={s}
                    onPress={() => setAmbience(s)}
                    // Reduced padding (p-3.5) and lower vertical margin (mb-3)
                    className={`w-[48%] rounded-2xl border p-3.5 mb-3 flex-row items-center ${active ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
                  >
                    <Ionicons name={icons[s] as any} size={18} color={active ? COLORS.primary : "white"} />
                    <Text className={`ml-3 font-bold text-sm ${active ? "text-primary" : "text-white/60"}`}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )
      }

      {/* --- MIXER ENTRY BUTTON --- */}
      {
        ambientEnabled && (
          <View>
            <Pressable
              onPress={() => setMixerModalVisible(true)}
              className={`bg-surface rounded-3xl border border-border p-5 flex-row items-center justify-between`}
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                  <Ionicons name="options-outline" size={20} color={COLORS.primary} />
                </View>
                <View className="ml-4">
                  <Text className="text-white font-bold text-base">Mixer Settings</Text>
                  <Text className="text-white/40 text-xs font-semibold">Fine-tune audio levels</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="white" />
            </Pressable>
          </View>
        )
      }

      {/* --- MIXER MODAL --- */}
      <Modal visible={mixerModalVisible} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/90">
          <View className="rounded-t-[40px] border-t border-primary/20 p-8 pb-14" style={{ backgroundColor: '#0A0A0A' }}>
            <View className="h-1 w-12 bg-white/10 rounded-full self-center mb-8" />

            <View className="flex-row justify-between items-center mb-10">
              <View>
                <Text className="text-white text-3xl font-extrabold">Mixer</Text>
                {/* Lighter subtext color (text-white/50) for better visibility */}
                <Text className="text-white/50 font-bold text-[10px] tracking-[2px] uppercase mt-1">Adjust Atmosphere</Text>
              </View>
              <Pressable onPress={() => setMixerModalVisible(false)} className="h-12 w-12 rounded-full bg-white/5 items-center justify-center border border-white/10">
                <Ionicons name="close" size={24} color="white" />
              </Pressable>
            </View>

            <View className="mb-12">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-white font-bold uppercase tracking-widest text-[11px]">Story Volume</Text>
                <Text className="text-white font-extrabold text-sm">{Math.round((storyVolume || 0) * 100)}%</Text>
              </View>
              <Slider value={storyVolume || 0} onValueChange={setStoryVolume} minimumTrackTintColor={COLORS.primary} maximumTrackTintColor="rgba(255,255,255,0.1)" thumbTintColor="white" />
            </View>

            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-white font-bold uppercase tracking-widest text-[11px]">Ambient Level</Text>
                <Text className="text-white font-extrabold text-sm">{Math.round((ambientVolume || 0) * 100)}%</Text>
              </View>
              <Slider value={ambientVolume || 0} onValueChange={setAmbientVolume} minimumTrackTintColor={COLORS.primary} maximumTrackTintColor="rgba(255,255,255,0.1)" thumbTintColor="white" />
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView >
  );
}