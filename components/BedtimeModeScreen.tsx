import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, Text, View } from 'react-native';
import { useBedtimeMode } from './BedtimeModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BedtimeModeScreenProps = {
    currentAudioTitle?: string;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onChangeSleepTimer: (minutes: number) => void;
};

export default function BedtimeModeScreen({
    currentAudioTitle = 'Audio',
    isPlaying,
    onTogglePlay,
    onChangeSleepTimer,
}: BedtimeModeScreenProps) {
    const { controlsVisible, showControls, hideControls, deactivateBedtimeMode, sleepTimer, setSleepTimer, dimmingLevel, smartLoopPhase, wakeUpTime, setWakeUpTime } = useBedtimeMode();

    // Animation values
    const controlsOpacity = useRef(new Animated.Value(0)).current;
    const fadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showTimerModal, setShowTimerModal] = React.useState(false);

    // Auto-fade controls after 4 seconds
    useEffect(() => {
        if (controlsVisible) {
            // Fade in
            Animated.timing(controlsOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            }).start();

            // Set timer to auto-hide
            if (fadeOutTimer.current) {
                clearTimeout(fadeOutTimer.current);
            }
            fadeOutTimer.current = setTimeout(() => {
                hideControls();
            }, 4000);
        } else {
            // Fade out
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();

            if (fadeOutTimer.current) {
                clearTimeout(fadeOutTimer.current);
                fadeOutTimer.current = null;
            }
        }

        return () => {
            if (fadeOutTimer.current) {
                clearTimeout(fadeOutTimer.current);
            }
        };
    }, [controlsVisible, controlsOpacity, hideControls]);

    const handleScreenTap = () => {
        if (!controlsVisible) {
            showControls();
        }
    };

    const handleSleepTimerPress = () => {
        setShowTimerModal(true);
        showControls(); // Keep controls visible while modal is open
    };

    const handleSelectTimer = (minutes: number) => {
        setSleepTimer(minutes);
        onChangeSleepTimer(minutes);
        setShowTimerModal(false);
    };

    // Quick Wake Up Time Setter for Demo (Set for 8 hours from now or 1 min for demo?)
    // Real implementation would need a DatePicker.
    // Let's toggle valid wake up time for demo purposes.
    const toggleWakeUp = () => {
        if (wakeUpTime) {
            setWakeUpTime(null);
        } else {
            // Set for 2 minutes from now for testing "Morning Hand-off"
            const d = new Date();
            d.setMinutes(d.getMinutes() + 2);
            setWakeUpTime(d);
        }
    };

    const handleExitBedtimeMode = () => {
        deactivateBedtimeMode();
    };

    // determine background color
    // "Sunrise Gold" = #fdfbd4 (or slightly darker for bg, maybe a warm orange/gold gradient?)
    // Request says: shift text to #fdfbd4, and screen to soft "Sunrise Gold".
    // Let's use a soft goldish background color.
    const bgColor = smartLoopPhase === 'wakeup' ? '#4a3b10' : '#0a0a0a'; // Dark gold vs true black

    return (
        <Pressable
            onPress={handleScreenTap}
            style={{
                flex: 1,
                backgroundColor: bgColor,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {/* Adaptive Dimming Overlay */}
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'black',
                    opacity: dimmingLevel,
                    pointerEvents: 'none', // Allow clicks to pass through
                    zIndex: 10,
                }}
            />

            {/* Dimmed Audio Title (always visible but very subtle) */}
            <View style={{ position: 'absolute', top: '40%', alignItems: 'center', zIndex: 1 }}>
                <Text style={{ color: '#fdfbd4', opacity: 0.15, fontSize: 16, fontWeight: '500' }}>
                    {currentAudioTitle} ({smartLoopPhase})
                </Text>
            </View>

            {/* Subtle Play/Pause Button (always visible but dimmed) */}
            <View style={{ opacity: controlsVisible ? 0 : 0.15, zIndex: 1 }}>
                <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color="#fdfbd4"
                />
            </View>

            {/* Controls (fade in on tap) */}
            <Animated.View
                style={{
                    opacity: controlsOpacity,
                    position: 'absolute',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: controlsVisible ? 'auto' : 'none',
                    zIndex: 20, // Abvoe dimming layer for interaction
                }}
            >
                {/* Play/Pause Button */}
                <Pressable
                    onPress={onTogglePlay}
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#fdfbd4',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={32}
                        color="#0a0a0a"
                        style={{ marginLeft: isPlaying ? 0 : 3 }}
                    />
                </Pressable>

                {/* Sleep Timer Button */}
                <Pressable
                    onPress={handleSleepTimerPress}
                    style={{
                        marginTop: 40,
                        width: 200,
                        height: 60,
                        borderRadius: 30,
                        borderWidth: 1.5,
                        borderColor: 'rgba(253, 251, 212, 0.3)',
                        backgroundColor: 'rgba(253, 251, 212, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: 'rgba(253, 251, 212, 0.75)', fontSize: 14, fontWeight: '500', marginBottom: 2 }}>
                        Sleep Timer
                    </Text>
                    <Text style={{ color: '#fdfbd4', fontSize: 24, fontWeight: '300' }}>
                        {sleepTimer ? `${sleepTimer} min` : 'Off'}
                    </Text>
                </Pressable>

                {/* Wake Up (Morning Hand-off) Button */}
                <Pressable
                    onPress={toggleWakeUp}
                    style={{
                        marginTop: 16,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                    }}
                >
                    <Text style={{ color: 'rgba(253, 251, 212, 0.5)', fontSize: 14, fontWeight: '500' }}>
                        {wakeUpTime ? `Wake Up: ${wakeUpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Set Morning Alarm'}
                    </Text>
                </Pressable>

                {/* Exit Bedtime Mode */}
                <Pressable
                    onPress={handleExitBedtimeMode}
                    style={{
                        marginTop: 16,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                    }}
                >
                    <Text style={{ color: 'rgba(253, 251, 212, 0.35)', fontSize: 16, fontWeight: '500' }}>
                        Exit Bedtime Mode
                    </Text>
                </Pressable>
            </Animated.View>

            {/* Sleep Timer Modal */}
            {showTimerModal && (
                <Pressable
                    onPress={() => setShowTimerModal(false)}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 30,
                    }}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            width: SCREEN_WIDTH * 0.85,
                            backgroundColor: '#1a1a1a',
                            borderRadius: 24,
                            padding: 32,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: 'rgba(253, 251, 212, 0.1)',
                        }}
                    >
                        <Text style={{ color: '#fdfbd4', fontSize: 20, fontWeight: '600', marginBottom: 24 }}>
                            Sleep Timer
                        </Text>

                        {/* Timer Options */}
                        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
                            {[15, 30, 60].map((minutes) => (
                                <Pressable
                                    key={minutes}
                                    onPress={() => handleSelectTimer(minutes)}
                                    style={{
                                        width: 90,
                                        height: 90,
                                        borderRadius: 45,
                                        borderWidth: sleepTimer === minutes ? 2 : 1.5,
                                        borderColor: sleepTimer === minutes ? '#fdfbd4' : 'rgba(253, 251, 212, 0.25)',
                                        backgroundColor: sleepTimer === minutes ? 'rgba(253, 251, 212, 0.15)' : 'rgba(253, 251, 212, 0.05)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="time-outline" size={20} color="rgba(253, 251, 212, 0.6)" />
                                    <Text style={{ color: '#fdfbd4', fontSize: 24, fontWeight: '400', marginTop: 4 }}>
                                        {minutes}
                                    </Text>
                                    <Text style={{ color: 'rgba(253, 251, 212, 0.5)', fontSize: 12, fontWeight: '500' }}>
                                        min
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={{ color: 'rgba(253, 251, 212, 0.45)', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                            Audio will fade out gently
                        </Text>
                    </Pressable>
                </Pressable>
            )}
        </Pressable>
    );
}
