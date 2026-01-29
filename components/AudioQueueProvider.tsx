import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useFirebase } from "./FirebaseStore";
import { getDownloadURL, getStorage, ref } from "firebase/storage";

// --- Configuration ---
const BROWN_NOISE_ASSET = require("@/assets/audio/brown-noise.mp3");
const OUTRO_TRIGGER_SECONDS = 30; // Start blooming brown noise 30s before end
const FADE_DURATION_MS = 5000; // Duration for cross-fakes if not specified otherwise (e.g. narrator fade in)
const BRIDGE_VOLUME = 0.4; // Brown noise volume during bridge
const DUCKED_VOLUME = 0.0; // Brown noise volume when story is full (or 0.1)

type PlaybackPhase = 'IDLE' | 'PLAYING' | 'OUTRO' | 'BRIDGE' | 'INTRO';

interface QueueItem {
    id: string;
    title: string;
    audioPath: string;
    mood?: string;
    [key: string]: any;
}

interface AudioQueueContextType {
    queue: QueueItem[];
    currentIndex: number;
    phase: PlaybackPhase;
    playQueue: (items: QueueItem[], startIndex?: number, autoPlay?: boolean) => Promise<void>;
    pauseQueue: () => void;
    resumeQueue: () => void;
    skipNext: () => void;
    skipPrevious: () => void;
    currentStory: QueueItem | null;
    isBuffering: boolean;
    isPlaying: boolean; // Effective playback state
    duration: number;
    currentTime: number;
    // For UI debug/display
    brownNoiseVolume: number;
    storyVolume: number;
    setStoryVolume: (v: number) => void;
    seekTo: (position: number) => void;
}

const AudioQueueContext = createContext<AudioQueueContextType | undefined>(undefined);

export function AudioQueueProvider({ children }: { children: React.ReactNode }) {
    const { app, user } = useFirebase();

    // --- State ---
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [phase, setPhase] = useState<PlaybackPhase>('IDLE');
    const [storyUrl, setStoryUrl] = useState<string | null>(null);

    // --- Players ---
    // 1. Story Player
    const storyPlayer = useAudioPlayer(storyUrl ? { uri: storyUrl } : null);
    const storyStatus = useAudioPlayerStatus(storyPlayer);

    // 2. Brown Noise Player (Always instantiated with local asset)
    const brownNoisePlayer = useAudioPlayer(BROWN_NOISE_ASSET);
    const brownNoiseStatus = useAudioPlayerStatus(brownNoisePlayer);

    // --- Volumes (State for UI, Refs for Animation Loop) ---
    const [storyVolume, setStoryVolume] = useState(1.0);
    const [brownNoiseVolume, setBrownNoiseVolume] = useState(0.0);

    // Refs for transition logic to avoid stale closures in intervals/effects
    const phaseRef = useRef<PlaybackPhase>('IDLE');
    const bridgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transitionCountRef = useRef(0); // Track if it's 1st, 2nd, 3rd transition
    const activeFadesRef = useRef(new Map<any, NodeJS.Timeout>()); // Track active fade intervals per player

    // Sync Ref with State
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // --- Load Audio URL Helper ---
    const loadStoryUrl = async (item: QueueItem) => {
        if (!app) return null;
        if (!item.audioPath) return null;
        try {
            console.log(`[AudioQueue] Loading URL for ${item.id}. Path: ${item.audioPath}. User: ${user?.uid || 'Unauth'}`);
            const storage = getStorage(app);
            const r = ref(storage, item.audioPath);
            return await getDownloadURL(r);
        } catch (e: any) {
            console.error(`[AudioQueue] ❌ Failed to load story URL: ${e.message}`, e);
            if (e.code === 'storage/unauthorized') {
                console.error(`[AudioQueue] 🔒 Permission denied. Verify storage rules allow read for uid: ${user?.uid}`);
            }
            return null;
        }
    };

    // --- Volume Fader Helper ---
    // --- Volume Fader Helper ---
    const fadeTo = (player: typeof storyPlayer, targetVol: number, durationMs: number, onUpdate?: (v: number) => void) => {
        if (!player) return;
        const startVol = player.volume;
        const startTime = Date.now();

        // Clear existing interval for this player to prevent conflict
        const existing = activeFadesRef.current.get(player);
        if (existing) clearInterval(existing as any);

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / durationMs, 1.0);

            // Linear fade
            const newVol = startVol + (targetVol - startVol) * progress;
            player.volume = newVol;
            if (onUpdate) onUpdate(newVol);

            if (progress >= 1.0) {
                clearInterval(interval);
                activeFadesRef.current.delete(player);
            }
        }, 50);

        activeFadesRef.current.set(player, interval);
    };

    // --- Queue Controls ---

    const playQueue = async (items: QueueItem[], startIndex = 0, autoPlay = true) => {
        console.log(`[AudioQueue] playQueue called. Items: ${items.length}, Start: ${startIndex}, AutoPlay: ${autoPlay}`);
        setQueue(items);
        setCurrentIndex(startIndex);
        transitionCountRef.current = 0; // Reset session

        // Start first item
        const item = items[startIndex];
        if (item) {
            const url = await loadStoryUrl(item);
            if (url) {
                setStoryUrl(url);
                // Reset volumes
                if (storyPlayer) storyPlayer.volume = 1.0;
                if (brownNoisePlayer) {
                    brownNoisePlayer.volume = 0.0;
                    brownNoisePlayer.loop = true;
                    if (autoPlay) brownNoisePlayer.play();
                }
                setStoryVolume(1.0);
                setBrownNoiseVolume(0.0);

                setPhase(autoPlay ? 'PLAYING' : 'IDLE'); // Or PAUSED?
            }
        }
    };

    const pauseQueue = () => {
        storyPlayer?.pause();
        brownNoisePlayer?.pause();
    };

    const resumeQueue = () => {
        if (phase === 'BRIDGE') {
            brownNoisePlayer?.play();
        } else {
            console.log("[AudioQueue] Resuming queue. Setting phase to PLAYING.");
            setPhase('PLAYING');
            storyPlayer?.play();
            // brownNoisePlayer might be playing depending on phase - ensure it's not silent if it handles "resume"
            if (brownNoiseVolume > 0) brownNoisePlayer?.play();
        }
    };

    const skipNext = () => {
        // Force next
        cleanupBridge();
        handleStoryEnd();
    };

    const skipPrevious = () => {
        // Simple impl
        if (currentIndex > 0) {
            // similar to playQueue logic for prev index
        }
    };

    const seekTo = (position: number) => {
        if (storyPlayer) {
            storyPlayer.seekTo(position);
        }
    };

    // --- Core Transition Logic (Effect Loop) ---

    // 1. Auto-play story when URL changes and phase is PLAYING
    useEffect(() => {
        if (!storyPlayer) return;

        if (storyUrl && phase === 'PLAYING') {
            console.log("[AudioQueue] 1. Auto-playing Story (PLAYING phase)");
            storyPlayer.play();
        } else if (storyUrl && phase === 'INTRO') {
            console.log("[AudioQueue] 1. Auto-playing Story (INTRO phase)");
            storyPlayer.play();
            // Fade in story
            storyPlayer.volume = 0;
            fadeTo(storyPlayer, 1.0, 30000, setStoryVolume); // 30s fade in
        } else if (phase === 'IDLE') {
            // Do not auto play. explicit pause to be safe against native auto-play
            console.log("[AudioQueue] 1. Phase is IDLE. Enforcing Pause.");
            if (storyPlayer.playing) storyPlayer.pause();
        }
    }, [storyUrl, phase, storyPlayer]);


    // 2. Monitor Time for Outro
    useEffect(() => {
        if (!storyStatus.playing) return;
        if (phase !== 'PLAYING') return;

        const timeLeft = (storyStatus.duration || 0) - (storyStatus.currentTime || 0);

        // If we are within the OUTRO window (30s)
        if (storyStatus.duration > 0 && timeLeft <= OUTRO_TRIGGER_SECONDS && timeLeft > 0) {
            console.log("Triggering OUTRO Phase");
            setPhase('OUTRO');
        }
    }, [storyStatus.currentTime, storyStatus.duration, phase, storyStatus.playing]);

    // 3. Handle OUTRO Phase (Bloom Brown Noise)
    // 3. Handle OUTRO Phase (Bloom Brown Noise + Fade Out Story)
    useEffect(() => {
        if (phase === 'OUTRO') {
            // Bloom Brown Noise
            console.log("Blooming Brown Noise & Fading Out Story");
            if (brownNoisePlayer) {
                brownNoisePlayer.play(); // Ensure it's playing
                fadeTo(brownNoisePlayer, BRIDGE_VOLUME, 25000, setBrownNoiseVolume);
            }
            // Fade Out Story (Subtle and smooth as requested)
            if (storyPlayer) {
                fadeTo(storyPlayer, 0.0, 25000, setStoryVolume);
            }
        }
    }, [phase, brownNoisePlayer, storyPlayer]);

    // 4. Handle Story End -> BRIDGE
    useEffect(() => {
        // Note: Expo audio doesn't always rely on status.playing=false for "End", need to check currentTime vs duration
        const isEnd = storyStatus.duration > 0 && storyStatus.currentTime >= storyStatus.duration - 0.5;

        if ((phase === 'PLAYING' || phase === 'OUTRO') && isEnd) {
            console.log("Story Ended. Entering BRIDGE.");
            handleStoryEnd();
        }
    }, [storyStatus.currentTime, storyStatus.duration, phase]);

    const handleStoryEnd = () => {
        setPhase('BRIDGE');

        // Determine Bridge Duration
        const count = transitionCountRef.current;
        let bridgeSeconds = 60;
        if (count === 1) bridgeSeconds = 120; // 2nd time
        if (count >= 2) bridgeSeconds = 300; // 3rd time
        // bridgeSeconds = 10; // DEBUG override

        console.log(`Bridging for ${bridgeSeconds}s...`);

        // Brown noise should be at BRIDGE_VOLUME already from OUTRO, but ensure
        if (brownNoisePlayer) {
            if (brownNoisePlayer.volume !== BRIDGE_VOLUME) {
                fadeTo(brownNoisePlayer, BRIDGE_VOLUME, 2000, setBrownNoiseVolume);
            }
        }

        bridgeTimerRef.current = setTimeout(() => {
            transitionToNextStory();
        }, bridgeSeconds * 1000);
    };

    const cleanupBridge = () => {
        if (bridgeTimerRef.current) {
            clearTimeout(bridgeTimerRef.current);
            bridgeTimerRef.current = null;
        }
    };

    const transitionToNextStory = async () => {
        cleanupBridge();

        if (currentIndex < queue.length - 1) {
            // Move to next
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            transitionCountRef.current += 1;

            const nextItem = queue[nextIdx];
            const url = await loadStoryUrl(nextItem);
            if (url) {
                setStoryUrl(url); // This triggers existing effect
                setPhase('INTRO');
            } else {
                setPhase('IDLE');
            }
        } else {
            console.log("Queue finished. Keeping Brown Noise?");
            setPhase('IDLE');
        }
    };

    // 5. Handle INTRO Phase
    useEffect(() => {
        if (phase === 'INTRO') {
            const duckTimer = setTimeout(() => {
                console.log("Ducking Brown Noise after Intro");
                if (brownNoisePlayer) {
                    fadeTo(brownNoisePlayer, DUCKED_VOLUME, 5000, setBrownNoiseVolume);
                }
                setPhase('PLAYING'); // Back to normal
            }, 30000); // match fade in duration

            return () => clearTimeout(duckTimer);
        }
    }, [phase, brownNoisePlayer]);

    // Effective Playback State
    const isPlaying = (storyStatus?.playing ?? false) || (brownNoiseStatus?.playing ?? false);

    return (
        <AudioQueueContext.Provider value={{
            queue,
            currentIndex,
            phase,
            playQueue: (i, start, auto) => playQueue(i, start, auto), // Fix signature
            pauseQueue,
            resumeQueue,
            skipNext,
            skipPrevious,
            currentStory: queue[currentIndex] || null,
            isBuffering: storyStatus.isBuffering,
            isPlaying,
            duration: storyStatus.duration,
            currentTime: storyStatus.currentTime,
            storyVolume,
            setStoryVolume,
            brownNoiseVolume,
            seekTo,
        }}>
            {children}
        </AudioQueueContext.Provider>
    );
}

export function useAudioQueue() {
    const context = useContext(AudioQueueContext);
    if (!context) throw new Error("useAudioQueue must be used within AudioQueueProvider");
    return context;
}

