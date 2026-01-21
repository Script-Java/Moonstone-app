import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";

import { useFirebase } from "@/components/FirebaseStore";
import Screen from "@/components/Screen";
import { COLORS } from "@/constants/colors";

type Filter = "All" | "Calm" | "Cozy" | "Romantic" | "Adventure";

interface LibraryItem {
  id: string;
  title: string;
  mood: string;
  createdAt: any;
  durationSec?: number;
  isFavorite?: boolean;
}

export default function Library() {
  const { db, user, functions } = useFirebase();
  // removed useTheme()

  // --- State ---
  const [filter, setFilter] = useState<Filter>("All");
  const [stories, setStories] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<LibraryItem | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const filters: Filter[] = ["All", "Calm", "Cozy", "Romantic", "Adventure"];

  // --- Real-time Subscription ---
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, "users", user.uid, "library"), orderBy("lastPlayedAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LibraryItem[];
      setStories(items);
      setLoading(false);
    }, (err) => setLoading(false));

    return () => unsubscribe();
  }, [db, user]);

  // --- Filtering Logic ---
  const filtered = stories.filter(s => {
    const matchesFilter = filter === "All" || s.mood === filter;
    const matchesSearch = searchQuery === "" || s.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });

  const formatDate = (ts: any) => {
    if (!ts) return "Recently";
    return new Date(ts.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // --- Actions ---
  const handleToggleFavorite = async () => {
    if (!selectedStory || !functions) return;
    const story = selectedStory;
    setMenuVisible(false);
    try {
      const toggleFn = httpsCallable(functions, 'toggleFavorite');
      await toggleFn({ storyId: story.id, isFavorite: !story.isFavorite });
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  const executeDelete = async () => {
    if (!selectedStory || !functions) return;
    const idToDelete = selectedStory.id;
    setDeleteConfirmVisible(false);
    setSelectedStory(null);

    try {
      const deleteFn = httpsCallable(functions, 'deleteStory');
      await deleteFn({ storyId: idToDelete });
    } catch (err: any) { Alert.alert("Error", err.message); }
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 30, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- HEADER --- */}
        <View className="flex-row justify-between items-start mb-8">
          <View className="flex-1">
            <Text className="text-primary font-bold tracking-[3px] text-[10px] uppercase">
              Welcome, {user?.displayName?.split(' ')[0] || 'there'}
            </Text>
            <Text className="text-white text-4xl font-extrabold tracking-tight mt-1">
              Your Library
            </Text>
          </View>
          <Pressable
            onPress={() => setSearchModalVisible(true)}
            className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-surface border border-border"
          >
            <Ionicons name="search" size={20} color={COLORS.primary} />
          </Pressable>
        </View>

        {/* --- REFINED FILTERS --- */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-6 px-6">
          <View className="flex-row gap-3 pr-10">
            {filters.map((f) => {
              const active = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-full border ${active ? "bg-primary border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={`font-bold text-xs uppercase tracking-widest ${active ? "text-black" : "text-white/40"}`}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* --- STORY LIST --- */}
        <View className="gap-5">
          {loading ? (
            <ActivityIndicator color={COLORS.primary} className="mt-10" />
          ) : filtered.length === 0 ? (
            <Text className="text-white/20 text-center mt-10 font-bold">No narratives found.</Text>
          ) : (
            filtered.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => router.push({ pathname: "/(tabs)/sleep", params: { storyId: it.id } })}
                className="bg-surface rounded-3xl border border-border p-5 flex-row items-center"
              >
                {/* Visual Placeholder for Story */}
                <View className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 items-center justify-center">
                  <Ionicons name="bookmark" size={20} color={it.isFavorite ? COLORS.primary : "rgba(255,255,255,0.2)"} />
                </View>

                <View className="ml-4 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-extrabold text-base flex-1 mr-2" numberOfLines={1}>
                      {it.title}
                    </Text>
                    <Pressable
                      onPress={() => { setSelectedStory(it); setMenuVisible(true); }}
                      className="p-1"
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.3)" />
                    </Pressable>
                  </View>

                  <View className="flex-row items-center mt-1">
                    <Text className="text-white/40 font-bold text-xs uppercase tracking-tighter">
                      {it.mood} • {Math.ceil((it.durationSec || 300) / 60)}m
                    </Text>
                    <Text className="text-white/20 text-xs mx-2">|</Text>
                    <Text className="text-white/40 font-bold text-xs">{formatDate(it.createdAt)}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View className="mt-12 items-center opacity-20">
          <Text className="text-white font-bold tracking-[4px] text-[10px] uppercase">
            End of Collection
          </Text>
        </View>
      </ScrollView>

      {/* --- MENU MODAL (OBSIDIAN THEME) --- */}
      <Modal transparent visible={menuVisible} animationType="slide">
        <Pressable className="flex-1 bg-black/90 justify-end" onPress={() => setMenuVisible(false)}>
          <View className="bg-[#0A0A0A] border-t border-primary/20 rounded-t-[40px] p-8 pb-12">
            <View className="h-1 w-12 bg-white/10 rounded-full self-center mb-8" />

            <Text className="text-white/40 font-bold text-center mb-6 uppercase tracking-widest text-[10px]">
              Managing: {selectedStory?.title}
            </Text>

            <View className="gap-3">
              <ActionButton
                icon={selectedStory?.isFavorite ? "heart" : "heart-outline"}
                label={selectedStory?.isFavorite ? "Unfavorite" : "Add to Favorites"}
                color={selectedStory?.isFavorite ? "#e11d48" : "white"}
                onPress={handleToggleFavorite}
              />
              <ActionButton
                icon="pencil-outline"
                label="Rename Story"
                onPress={() => { setEditTitle(selectedStory?.title || ""); setEditModalVisible(true); setMenuVisible(false); }}
              />
              <ActionButton
                icon="trash-outline"
                label="Delete Permanently"
                color="#ef4444"
                onPress={() => { setDeleteConfirmVisible(true); setMenuVisible(false); }}
              />
              <Pressable onPress={() => setMenuVisible(false)} className="mt-4 p-4 items-center">
                <Text className="text-white/30 font-bold">Close Menu</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* --- DELETE CONFIRMATION --- */}
      <Modal transparent visible={deleteConfirmVisible} animationType="fade">
        <View className="flex-1 bg-black/95 justify-center items-center px-8">
          <View className="bg-surface border border-border rounded-[32px] p-8 w-full items-center">
            <View className="h-16 w-16 bg-red-500/10 rounded-full items-center justify-center mb-6">
              <Ionicons name="trash" size={30} color="#ef4444" />
            </View>
            <Text className="text-white text-2xl font-extrabold text-center">Delete Story?</Text>
            <Text className="text-white/50 text-center mt-3 mb-8 font-semibold">
              This will permanently remove this journey from your vault.
            </Text>
            <View className="w-full gap-3">
              <Pressable onPress={executeDelete} className="bg-red-500 py-4 rounded-2xl items-center">
                <Text className="text-white font-extrabold text-lg">Confirm Delete</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteConfirmVisible(false)} className="bg-white/5 py-4 rounded-2xl items-center">
                <Text className="text-white/40 font-bold">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal transparent visible={editModalVisible} animationType="slide">
        <View className="flex-1 bg-black/90 justify-end">
          <View className="bg-[#0A0A0A] border-t border-primary/20 rounded-t-[40px] p-8 pb-12">
            <Text className="text-white text-3xl font-extrabold mb-2">Rename</Text>
            <Text className="text-white/40 font-bold text-[10px] tracking-[2px] uppercase mb-8">Update your narrative title</Text>

            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Enter new title"
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="bg-white/5 border border-border rounded-2xl px-5 py-4 text-white font-bold text-lg mb-8"
              autoFocus
            />

            <View className="flex-row gap-4">
              <Pressable onPress={() => setEditModalVisible(false)} className="flex-1 bg-white/5 py-4 rounded-2xl items-center">
                <Text className="text-white/40 font-bold">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!selectedStory) return;
                  await updateDoc(doc(db, "stories", selectedStory.id), { title: editTitle.trim() });
                  setEditModalVisible(false);
                }}
                className="flex-2 bg-primary py-4 px-10 rounded-2xl items-center"
              >
                <Text className="text-black font-extrabold text-lg">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- SEARCH MODAL --- */}
      <Modal transparent visible={searchModalVisible} animationType="fade">
        <View className="flex-1 bg-[#0A0A0A] px-6 pt-20">
          <View className="flex-row items-center bg-white/5 border border-border rounded-3xl px-5 py-4 mb-6">
            <Ionicons name="search" size={20} color={COLORS.primary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Find a story..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              className="flex-1 ml-4 text-white font-bold text-lg"
              autoFocus
            />
            <Pressable onPress={() => { setSearchQuery(""); setSearchModalVisible(false); }}>
              <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.2)" />
            </Pressable>
          </View>

          <ScrollView className="flex-1">
            {filtered.slice(0, 5).map(s => (
              <Pressable
                key={s.id}
                className="py-4 border-b border-white/5"
                onPress={() => { setSearchModalVisible(false); router.push({ pathname: "/(tabs)/sleep", params: { storyId: s.id } }); }}
              >
                <Text className="text-white font-bold text-lg">{s.title}</Text>
                <Text className="text-white/30 text-xs uppercase font-bold">{s.mood}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

// --- Helper Component ---
function ActionButton({ icon, label, onPress, color = "white" }: any) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center bg-white/5 p-5 rounded-[24px] border border-white/5"
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text className="ml-4 font-bold text-lg" style={{ color }}>{label}</Text>
    </Pressable>
  );
}