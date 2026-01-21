import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";

// Internal Assets & Components
import { useFirebase } from "@/components/FirebaseStore";
import PreferenceModal, { PreferenceOption } from "@/components/PreferenceModal";
import Screen from "@/components/Screen";
import {
  HelpFAQContent,
  PrivacyPolicyContent,
  TermsOfServiceContent
} from "@/components/SupportContent";
import SupportModal from "@/components/SupportModal";
import { VOICE_PACK, VoiceKey } from "@/components/VoiceSelector";

const MOOD_OPTIONS: PreferenceOption[] = [
  { value: "dreamy", label: "Dreamy", description: "Soft, whimsical adventures" },
  { value: "calm", label: "Calm", description: "Peaceful, soothing tales" },
  { value: "magical", label: "Magical", description: "Enchanted worlds and spells" },
];

const SLEEP_TIMER_OPTIONS: PreferenceOption[] = [
  { value: "0", label: "Never", description: "Play continuously" },
  { value: "15", label: "15 minutes", description: "Quick power nap" },
  { value: "30", label: "30 minutes", description: "Perfect for most sleepers" },
  { value: "60", label: "60 minutes", description: "Full hour of stories" },
];

export default function Settings() {
  const { user, db, auth, functions } = useFirebase();
  // removed useTheme() - theme selection removed

  // --- Profile State ---
  const [credits, setCredits] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [defaultMood, setDefaultMood] = useState("dreamy");
  const [defaultVoiceKey, setDefaultVoiceKey] = useState<VoiceKey>("kore");
  const [sleepTimer, setSleepTimer] = useState("30");

  // --- Modal States ---
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [supportContent, setSupportContent] = useState<{ title: string; icon: any; content: any } | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    return onSnapshot(doc(db, "users", user.uid), (doc) => {
      const data = doc.data();
      setCredits(data?.credits || 0);
      setIsPremium(data?.isPremium || false);
      setPhotoURL(data?.photoURL || null);
      setDefaultMood(data?.defaultMood || "dreamy");
      setDefaultVoiceKey(data?.defaultVoiceKey || "gb_wavenet_d");
      setSleepTimer(String(data?.sleepTimer || 30));
    });
  }, [user, db]);

  const updatePreference = async (field: string, value: any) => {
    if (!user || !db) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { [field]: value });
    } catch (error) { Alert.alert("Error", "Could not update setting."); }
  };

  const handleProfilePictureUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoURL(base64Image);
      updatePreference("photoURL", base64Image);
    }
  };

  return (
    <Screen>
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
              Account
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-surface border border-border"
          >
            <Ionicons name="chevron-back" size={20} color="white" />
          </Pressable>
        </View>

        {/* --- PROFILE CARD --- */}
        <View className="flex-row items-center bg-surface rounded-[32px] border border-border p-5 mb-6">
          <View className="relative">
            {photoURL ? (
              // Updated: Changed border-primary/20 to border-primary for solid color
              <Image source={{ uri: photoURL }} className="h-20 w-20 rounded-2xl border-2 border-primary" />
            ) : (
              // Updated: Changed border-primary/20 to border-primary for solid color
              <View className="h-20 w-20 rounded-2xl bg-primary/10 items-center justify-center border-2 border-primary">
                <Text className="text-primary font-extrabold text-2xl">{(user?.email?.[0] || "A").toUpperCase()}</Text>
              </View>
            )}
            <Pressable
              onPress={handleProfilePictureUpload}
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary items-center justify-center border-4 border-[#0D0D0D]"
            >
              <Ionicons name="camera" size={14} color="black" />
            </Pressable>
          </View>

          <View className="ml-5 flex-1">
            <Text className="text-white text-xl font-extrabold" numberOfLines={1}>
              {user?.displayName || "Dreamer"}
            </Text>
            <Text className="text-white/40 font-bold text-xs" numberOfLines={1}>
              {user?.email}
            </Text>
            {isPremium && (
              <View className="mt-2 self-start bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <Text className="text-primary text-[10px] font-bold tracking-widest uppercase">Premium Member</Text>
              </View>
            )}
          </View>
        </View>

        {/* --- CURRENCY CARD --- */}
        <View className="bg-primary rounded-[32px] p-6 mb-10 flex-row items-center justify-between shadow-xl shadow-primary/20">
          <View>
            <Text className="text-black font-bold tracking-[2px] text-[10px] uppercase">Moonstone Vault</Text>
            <Text className="text-black text-4xl font-extrabold mt-1">{credits}</Text>
            <Text className="text-black/60 font-bold text-xs">Available Credits</Text>
          </View>
          <Pressable className="bg-black px-5 py-3 rounded-2xl">
            <Text className="text-white font-extrabold text-sm">Top Up</Text>
          </Pressable>
        </View>

        {/* --- PREFERENCES SECTION --- */}
        <Text className="text-primary font-bold tracking-[3px] text-[10px] uppercase mb-4 ml-1">App Preferences</Text>
        <View className="bg-surface rounded-[32px] border border-border overflow-hidden mb-10">
          <SettingRow icon="moon-outline" title="Story Mood" value={MOOD_OPTIONS.find(o => o.value === defaultMood)?.label} onPress={() => setMoodModalVisible(true)} />
          <SettingRow icon="mic-outline" title="Narrator" value={VOICE_PACK[defaultVoiceKey]?.name} onPress={() => setVoiceModalVisible(true)} />
          <SettingRow icon="timer-outline" title="Sleep Timer" value={SLEEP_TIMER_OPTIONS.find(o => o.value === sleepTimer)?.label} onPress={() => setTimerModalVisible(true)} last />
        </View>

        {/* --- SUPPORT SECTION --- */}
        <Text className="text-primary font-bold tracking-[3px] text-[10px] uppercase mb-4 ml-1 mt-10">Support & Legal</Text>
        <View className="bg-surface rounded-[32px] border border-border overflow-hidden mb-8">
          <SettingRow icon="help-circle-outline" title="Help & FAQ" onPress={() => setSupportContent({ title: "Help & FAQ", icon: "help-circle", content: <HelpFAQContent /> })} />
          <SettingRow icon="shield-checkmark-outline" title="Privacy Policy" onPress={() => setSupportContent({ title: "Privacy Policy", icon: "shield-checkmark", content: <PrivacyPolicyContent /> })} />
          <SettingRow icon="document-text-outline" title="Terms of Service" onPress={() => setSupportContent({ title: "Terms of Service", icon: "document-text", content: <TermsOfServiceContent /> })} last />
        </View>

        {/* --- LOGOUT --- */}
        <Pressable
          onPress={() => auth?.signOut().then(() => router.replace("/(onboarding)/auth"))}
          className="bg-red-500/10 border border-red-500/20 rounded-3xl py-5 items-center flex-row justify-center"
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="ml-3 text-red-500 font-extrabold text-base">Sign Out of Moonstone</Text>
        </Pressable>

        <Text className="text-white/20 text-center mt-10 font-bold text-[10px] tracking-[4px] uppercase">
          Moonstone v2.4.1 (Build 402)
        </Text>
      </ScrollView>

      {/* --- MODALS --- */}
      <PreferenceModal visible={moodModalVisible} onClose={() => setMoodModalVisible(false)} title="Default Mood" icon="moon" options={MOOD_OPTIONS} selectedValue={defaultMood} onSelect={(v) => { setDefaultMood(v); updatePreference("defaultMood", v); }} />
      <PreferenceModal visible={timerModalVisible} onClose={() => setTimerModalVisible(false)} title="Sleep Timer" icon="timer" options={SLEEP_TIMER_OPTIONS} selectedValue={sleepTimer} onSelect={(v) => { setSleepTimer(v); updatePreference("sleepTimer", parseInt(v)); }} />

      {supportContent && (
        <SupportModal visible={!!supportContent} onClose={() => setSupportContent(null)} title={supportContent.title} icon={supportContent.icon} content={supportContent.content} />
      )}
    </Screen>
  );
}

// --- HELPER COMPONENTS ---

function SettingRow({ icon, title, value, onPress, last }: any) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center px-6 py-5 ${!last && 'border-b border-white/5'}`}>
      <View className="h-10 w-10 rounded-2xl bg-white/5 items-center justify-center border border-white/5">
        <Ionicons name={icon} size={18} color="white" />
      </View>
      <Text className="ml-4 text-white font-bold text-base">{title}</Text>
      <View className="ml-auto flex-row items-center">
        {value && <Text className="text-white/40 font-bold text-xs mr-2">{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.2)" />
      </View>
    </Pressable>
  );
}

