import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, RefreshControl, Alert, Modal, Platform, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "@/components/Screen";
import Logo from "@/components/Logo";
import { useFirebase } from "@/components/FirebaseStore";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";
import { httpsCallable } from "firebase/functions";

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
  const [filter, setFilter] = useState<Filter>("All");
  const [stories, setStories] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const filters: Filter[] = ["All", "Calm", "Cozy", "Romantic", "Adventure"];

  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedStory, setSelectedStory] = useState<LibraryItem | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<LibraryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState<LibraryItem | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (!db || !user) return;

    const q = query(
      collection(db, "users", user.uid, "library"),
      orderBy("lastPlayedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LibraryItem[];
      setStories(items);
      setLoading(false);
    }, (err) => {
      console.error("Library fetch error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, user]);

  // Filter stories by search and mood filter
  const filtered = stories.filter(s => {
    const matchesFilter = filter === "All" || s.mood === filter;
    const matchesSearch = searchQuery === "" ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mood?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    // Sort favorites to the top first
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;

    // If both are favorites or both are not, sort by lastPlayedAt
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  const formatDate = (ts: any) => {
    if (!ts) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const openMenu = (item: LibraryItem) => {
    setSelectedStory(item);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedStory(null);
  };

  const handleToggleFavorite = async () => {
    if (!selectedStory || !functions) return;
    const newStatus = !selectedStory.isFavorite;

    // Close menu immediately for responsiveness
    closeMenu();

    try {
      const toggleFn = httpsCallable(functions, 'toggleFavorite');
      await toggleFn({ storyId: selectedStory.id, isFavorite: newStatus });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const confirmDelete = () => {
    if (!selectedStory) return;
    const story = selectedStory;
    closeMenu();
    // Wait for menu to close before showing delete modal
    setTimeout(() => {
      setStoryToDelete(story);
      setDeleteConfirmVisible(true);
    }, 300);
  };

  const executeDelete = async () => {
    if (!storyToDelete) return;
    const idToDelete = storyToDelete.id;

    setDeleteConfirmVisible(false);
    console.log("Deleting story:", idToDelete);

    if (!functions) {
      Alert.alert("Error", "Firebase Functions not initialized.");
      setStoryToDelete(null);
      return;
    }

    // Optimistic update: Remove immediately from UI
    setStories(prev => prev.filter(s => s.id !== idToDelete));

    try {
      const deleteFn = httpsCallable(functions, 'deleteStory');
      await deleteFn({ storyId: idToDelete });
      console.log("Story deleted successfully:", idToDelete);
    } catch (err: any) {
      console.error("Delete failed:", err);
      Alert.alert("Error", "Failed to delete: " + err.message);
    }

    setStoryToDelete(null);
  };

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="flex-row items-center justify-between mb-2">
          <Logo size="small" />
          <Pressable
            onPress={() => setSearchModalVisible(true)}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>

        {/* Filter chips */}
        <View className="mt-5 flex-row gap-2">
          {filters.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className={[
                  "px-5 py-3 rounded-full border",
                  active ? "bg-primary border-primary/60" : "bg-surface border-border",
                ].join(" ")}
              >
                <Text className={["font-extrabold", active ? "text-white" : "text-white/55"].join(" ")}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* List */}
        <View className="mt-5 gap-4">
          {filtered.length === 0 && !loading && (
            <Text className="text-white/40 text-center mt-10">No stories found.</Text>
          )}

          {filtered.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => router.push({ pathname: "/(tabs)/sleep", params: { storyId: it.id } })}
              className="rounded-3xl border border-border bg-surface p-4"
            >
              <View className="flex-row items-center">
                <View className="h-14 w-14 rounded-2xl bg-white/10 items-center justify-center">
                  <Ionicons name="play" size={22} color="rgba(255,255,255,0.65)" />
                </View>

                <View className="ml-4 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-white font-extrabold text-base" numberOfLines={1}>
                      {it.title}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                        <Text className="text-white/80 font-extrabold text-xs">{it.mood || "STORY"}</Text>
                      </View>
                      <Pressable onPress={() => openMenu(it)}>
                        <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.6)" />
                      </Pressable>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-white/45 font-bold">
                      {formatDate(it.createdAt)}  •  {Math.ceil((it.durationSec || 300) / 60)} min
                    </Text>

                    {it.isFavorite ? <Ionicons name="heart" size={18} color="#e11d48" /> : null}
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <Text className="text-white/25 font-extrabold tracking-widest text-xs text-center mt-8">
          END OF COLLECTION
        </Text>
      </ScrollView>

      {/* Menu Modal / Drodown */}
      {selectedStory && (
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={closeMenu}
        >
          <Pressable className="flex-1 bg-black/60 justify-end" onPress={closeMenu}>
            <View className="bg-surface border-t border-border rounded-t-3xl p-5 pb-10 gap-3">
              <Text className="text-center text-white/50 font-bold mb-2">{selectedStory.title}</Text>

              <Pressable
                onPress={handleToggleFavorite}
                className="flex-row items-center gap-3 p-4 rounded-xl bg-white/5 active:bg-white/10"
              >
                <Ionicons
                  name={selectedStory.isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={selectedStory.isFavorite ? "#e11d48" : "white"}
                />
                <Text className="text-white font-bold text-lg">
                  {selectedStory.isFavorite ? "Unfavorite" : "Favorite"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const story = selectedStory;
                  closeMenu();
                  // Wait for menu to close before showing edit modal
                  setTimeout(() => {
                    setStoryToEdit(story);
                    setEditTitle(story.title);
                    setEditModalVisible(true);
                  }, 300);
                }}
                className="flex-row items-center gap-3 p-4 rounded-xl bg-white/5 active:bg-white/10"
              >
                <Ionicons name="pencil-outline" size={22} color="white" />
                <Text className="text-white font-bold text-lg">Edit</Text>
              </Pressable>

              <Pressable
                onPress={confirmDelete}
                className="flex-row items-center gap-3 p-4 rounded-xl bg-white/5 active:bg-white/10"
              >
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <Text className="text-red-500 font-bold text-lg">Delete</Text>
              </Pressable>

              <Pressable
                onPress={closeMenu}
                className="mt-2 items-center p-3"
              >
                <Text className="text-white/50 font-bold text-base">Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {storyToDelete && (
        <Modal
          transparent
          visible={deleteConfirmVisible}
          animationType="fade"
          onRequestClose={() => {
            setDeleteConfirmVisible(false);
            setStoryToDelete(null);
          }}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-center items-center px-5"
            onPress={() => {
              setDeleteConfirmVisible(false);
              setStoryToDelete(null);
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="bg-surface border border-border rounded-3xl p-6 w-80 max-w-full">
                {/* Icon */}
                <View className="items-center mb-4">
                  <View className="h-16 w-16 rounded-full bg-red-500/20 items-center justify-center">
                    <Ionicons name="trash" size={32} color="#ef4444" />
                  </View>
                </View>

                {/* Title */}
                <Text className="text-white text-2xl font-extrabold text-center mb-2">
                  Delete Story?
                </Text>

                {/* Message */}
                <Text className="text-white/60 text-center font-semibold mb-6">
                  Are you sure you want to delete "{storyToDelete.title}"? This action cannot be undone.
                </Text>

                {/* Buttons */}
                <View className="gap-3">
                  <Pressable
                    onPress={executeDelete}
                    className="bg-red-500 rounded-2xl p-4 items-center active:bg-red-600"
                  >
                    <Text className="text-white font-extrabold text-lg">Delete Story</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setDeleteConfirmVisible(false);
                      setStoryToDelete(null);
                    }}
                    className="bg-white/10 rounded-2xl p-4 items-center active:bg-white/20"
                  >
                    <Text className="text-white font-extrabold text-lg">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Edit Story Modal */}
      {storyToEdit && (
        <Modal
          transparent
          visible={editModalVisible}
          animationType="slide"
          onRequestClose={() => {
            setEditModalVisible(false);
            setEditTitle("");
          }}
        >
          <Pressable
            className="flex-1 bg-black/70 justify-end"
            onPress={() => {
              setEditModalVisible(false);
              setStoryToEdit(null);
              setEditTitle("");
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="bg-surface border-t border-border rounded-t-3xl p-6 pb-10">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-white text-2xl font-extrabold">Edit Story</Text>
                  <Pressable
                    onPress={() => {
                      setEditModalVisible(false);
                      setStoryToEdit(null);
                      setEditTitle("");
                    }}
                  >
                    <Ionicons name="close" size={28} color="rgba(255,255,255,0.6)" />
                  </Pressable>
                </View>

                <Text className="text-white/70 font-bold mb-2">Story Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter story title"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="bg-white/10 border border-border rounded-2xl px-4 py-4 text-white font-semibold mb-6"
                />

                <Pressable
                  onPress={async () => {
                    if (!editTitle.trim()) {
                      Alert.alert("Error", "Title cannot be empty");
                      return;
                    }

                    if (!db || !storyToEdit) return;

                    try {
                      // Update in Firestore
                      const storyRef = doc(db, "stories", storyToEdit.id);
                      await updateDoc(storyRef, { title: editTitle.trim() });

                      // Update local state
                      setStories(prev => prev.map(s =>
                        s.id === storyToEdit.id ? { ...s, title: editTitle.trim() } : s
                      ));

                      setEditModalVisible(false);
                      setStoryToEdit(null);
                      setEditTitle("");
                      Alert.alert("Success", "Story title updated!");
                    } catch (err: any) {
                      console.error("Failed to update title:", err);
                      Alert.alert("Error", "Failed to update: " + err.message);
                    }
                  }}
                  className="bg-primary rounded-2xl p-4 items-center"
                >
                  <Text className="text-white font-extrabold text-lg">Save Changes</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Search Modal */}
      <Modal
        transparent
        visible={searchModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setSearchModalVisible(false);
        }}
      >
        <Pressable
          className="flex-1 bg-black/70 justify-end"
          onPress={() => setSearchModalVisible(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-surface border-t border-border rounded-t-3xl p-6 pb-10">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-white text-2xl font-extrabold">Search Stories</Text>
                <Pressable onPress={() => setSearchModalVisible(false)}>
                  <Ionicons name="close" size={28} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              <View className="flex-row items-center bg-white/10 border border-border rounded-2xl px-4 mb-4">
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by title or mood..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="flex-1 py-4 px-3 text-white font-semibold"
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={() => setSearchModalVisible(false)}
                className="bg-primary rounded-2xl p-4 items-center"
              >
                <Text className="text-white font-extrabold text-lg">
                  {searchQuery ? `Search "${searchQuery}"` : "Close"}
                </Text>
              </Pressable>

              {searchQuery && (
                <Pressable
                  onPress={() => {
                    setSearchQuery("");
                    setSearchModalVisible(false);
                  }}
                  className="mt-3 items-center p-3"
                >
                  <Text className="text-white/50 font-bold">Clear Search</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
