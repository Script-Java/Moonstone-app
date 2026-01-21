import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

import { useBedtimeMode } from "@/components/BedtimeModeContext";
import BedtimeModeScreen from "@/components/BedtimeModeScreen";
import { useFirebase } from "@/components/FirebaseStore";
import Screen from "@/components/Screen";
import { COLORS } from "@/constants/colors";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

const AMBIENT_SOUNDS = {
  Rain: require("@/assets/audio/rain.mp3"),
  Ocean: require("@/assets/audio/ocean.mp3"),
  Fire: require("@/assets/audio/fire.mp3"),
  Forest: require("@/assets/audio/forest.mp3"),
} as const;

type AmbienceKey = keyof typeof AMBIENT_SOUNDS;

export default function Sleep() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const { db, app, user } = useFirebase();
  const [story, setStory] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  const [ambience, setAmbience] = useState<AmbienceKey>("Rain");
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [storyVolume, setStoryVolume] = useState(1.0);
  const [ambientVolume, setAmbientVolume] = useState(0.3);

  useEffect(() => {
    async function fetchStory() {
      if (!storyId || !db) { setFetching(false); return; }
      setFetching(true);
      try {
        const docRef = doc(db, "stories", storyId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setStory(data);
          if (data.audioPath) {
            const storage = getStorage(app!);
            const audioRef = ref(storage, data.audioPath);
            const url = await getDownloadURL(audioRef);
            setAudioUrl(url);
          }
        }
      } catch (e) { console.error("❌ Error:", e); } finally { setFetching(false); }
    }
    fetchStory();
  }, [db, storyId]);

  return (
    <Screen>
      {!story && !fetching ? (
        <View className="flex-1 items-center justify-center p-10">
          <Ionicons name="moon-outline" size={48} color="rgba(255,255,255,0.1)" />
          <Text className="text-white/40 font-bold text-center mt-4">Choose a journey to begin.</Text>
        </View>
      ) : (
        <StoryPlayer
          story={story}
          audioUrl={audioUrl}
          ambience={ambience}
          setAmbience={setAmbience}
          ambientEnabled={ambientEnabled}
          setAmbientEnabled={setAmbientEnabled}
          storyVolume={storyVolume}
          setStoryVolume={setStoryVolume}
          ambientVolume={ambientVolume}
          setAmbientVolume={setAmbientVolume}
          loading={fetching}
          userName={user?.displayName?.split(' ')[0] || 'there'}
        />
      )}
    </Screen>
  );
}

function StoryPlayer({ story, audioUrl, ambience, setAmbience, ambientEnabled, setAmbientEnabled, storyVolume, setStoryVolume, ambientVolume, setAmbientVolume, loading, colors, theme, userName }: any) {
  const { isActive: bedtimeModeActive, activateBedtimeMode, setSleepTimer } = useBedtimeMode();
  const [mixerModalVisible, setMixerModalVisible] = React.useState(false);

  const storySource = useMemo(() => (audioUrl ? { uri: audioUrl } : null), [audioUrl]);
  const storyPlayer = useAudioPlayer(storySource);
  const storyStatus = useAudioPlayerStatus(storyPlayer);

  const ambientPlayers = {
    Rain: useAudioPlayer(AMBIENT_SOUNDS.Rain),
    Ocean: useAudioPlayer(AMBIENT_SOUNDS.Ocean),
    Fire: useAudioPlayer(AMBIENT_SOUNDS.Fire),
    Forest: useAudioPlayer(AMBIENT_SOUNDS.Forest),
  };

  useEffect(() => {
    if (storyPlayer) storyPlayer.volume = storyVolume;
    Object.entries(ambientPlayers).forEach(([key, player]) => {
      if (!player) return;
      player.loop = true;
      const isActive = key === ambience;
      if (isActive && ambientEnabled && storyStatus.playing) {
        player.volume = ambientVolume;
        player.play();
      } else {
        player.pause();
      }
    });
  }, [storyVolume, ambientVolume, ambientEnabled, storyStatus.playing, ambience]);

  const formatSeconds = (s: number) => {
    const totalSec = Math.floor(s || 0);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" + sec : sec}`;
  };

  if (bedtimeModeActive) {
    return <BedtimeModeScreen currentAudioTitle={story?.title || "Audio"} isPlaying={!!storyStatus.playing} onTogglePlay={() => storyStatus.playing ? storyPlayer?.pause() : storyPlayer?.play()} onChangeSleepTimer={(m: number) => setSleepTimer(m)} />;
  }

  return (
    <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 30, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* --- HEADER --- */}
      <View className="flex-row justify-between items-start mb-8">
        <View className="flex-1">
          <Text className="text-primary font-bold tracking-[3px] text-[10px] uppercase">Welcome, {userName}</Text>
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
                <Text className="text-black font-bold text-[10px] tracking-widest uppercase">{storyStatus.playing ? "Flowing" : "Paused"}</Text>
              </View>
              <Text className="text-white font-bold text-xs">{formatSeconds(storyStatus.duration - storyStatus.currentTime)} left</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-white text-3xl font-extrabold tracking-tight" numberOfLines={1}>{story?.title || "Preparing..."}</Text>
                <Text className="text-white/60 font-bold text-sm mt-1 uppercase tracking-tighter">{story?.mood || "Deep"} Narrative</Text>
              </View>
              <Pressable onPress={() => storyStatus.playing ? storyPlayer?.pause() : storyPlayer?.play()} disabled={loading || !audioUrl} className="h-16 w-16 rounded-full items-center justify-center bg-primary">
                {loading ? <ActivityIndicator color="black" /> : <Ionicons name={storyStatus.playing ? "pause" : "play"} size={28} color="black" style={{ marginLeft: storyStatus.playing ? 0 : 4 }} />}
              </Pressable>
            </View>
            <View className="mt-6 h-1 rounded-full bg-white/20 overflow-hidden">
              <View style={{ width: `${(storyStatus.currentTime / storyStatus.duration) * 100}%` }} className="h-full bg-primary" />
            </View>
          </View>
        </ImageBackground>
      </View>

      {/* --- SOUNDSCAPE MASTER SWITCH --- */}
      <View className="mb-6">
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
      </View>

      {/* --- REFINED AMBIENT OPTIONS GRID (SMALLER BUTTONS) --- */}
      <View className={`mb-6 ${!ambientEnabled && 'opacity-30'}`}>
        <View className="flex-row flex-wrap justify-between">
          {(["Rain", "Ocean", "Fire", "Forest"] as const).map((s) => {
            const active = ambience === s;
            const icons = { Rain: "water-outline", Ocean: "pulse-outline", Fire: "flame-outline", Forest: "leaf-outline" };
            return (
              <Pressable
                key={s}
                onPress={() => setAmbience(s)}
                disabled={!ambientEnabled}
                // Reduced padding (p-3.5) and lower vertical margin (mb-3)
                className={`w-[48%] rounded-2xl border p-3.5 mb-3 flex-row items-center ${active && ambientEnabled ? "border-primary bg-primary/10" : "border-border bg-surface"}`}
              >
                <Ionicons name={icons[s] as any} size={18} color={active && ambientEnabled ? COLORS.primary : "white"} />
                <Text className={`ml-3 font-bold text-sm ${active && ambientEnabled ? "text-primary" : "text-white/60"}`}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* --- MIXER ENTRY BUTTON --- */}
      <View className={!ambientEnabled ? 'opacity-30' : ''}>
        <Pressable
          onPress={() => ambientEnabled && setMixerModalVisible(true)}
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
                <Text className="text-white font-extrabold text-sm">{Math.round(storyVolume * 100)}%</Text>
              </View>
              <Slider value={storyVolume} onValueChange={setStoryVolume} minimumTrackTintColor={COLORS.primary} maximumTrackTintColor="rgba(255,255,255,0.1)" thumbTintColor="white" />
            </View>

            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-white font-bold uppercase tracking-widest text-[11px]">Ambient Level</Text>
                <Text className="text-white font-extrabold text-sm">{Math.round(ambientVolume * 100)}%</Text>
              </View>
              <Slider value={ambientVolume} onValueChange={setAmbientVolume} minimumTrackTintColor={COLORS.primary} maximumTrackTintColor="rgba(255,255,255,0.1)" thumbTintColor="white" />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}