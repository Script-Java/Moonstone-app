import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    const { controlsVisible, showControls, hideControls, deactivateBedtimeMode, sleepTimer, setSleepTimer } = useBedtimeMode();

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

    const handleExitBedtimeMode = () => {
        deactivateBedtimeMode();
    };

    return (
        <Pressable
            onPress={handleScreenTap}
            style={{
                flex: 1,
                backgroundColor: 'hsl(220, 15%, 8%)',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {/* Dimmed Audio Title (always visible but very subtle) */}
            <View style={{ position: 'absolute', top: '40%', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: 16, fontWeight: '500' }}>
                    {currentAudioTitle}
                </Text>
            </View>

            {/* Subtle Play/Pause Button (always visible but dimmed) */}
            <View style={{ opacity: controlsVisible ? 0 : 0.15 }}>
                <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color="rgba(255, 255, 255, 1)"
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
                }}
            >
                {/* Play/Pause Button */}
                <Pressable
                    onPress={onTogglePlay}
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={32}
                        color="#000"
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
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 14, fontWeight: '500', marginBottom: 2 }}>
                        Sleep Timer
                    </Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 1)', fontSize: 24, fontWeight: '300' }}>
                        {sleepTimer ? `${sleepTimer} min` : 'Off'}
                    </Text>
                </Pressable>

                {/* Exit Bedtime Mode */}
                <Pressable
                    onPress={handleExitBedtimeMode}
                    style={{
                        marginTop: 32,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                    }}
                >
                    <Text style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 16, fontWeight: '500' }}>
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
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        style={{
                            width: SCREEN_WIDTH * 0.85,
                            backgroundColor: 'hsl(220, 15%, 18%)',
                            borderRadius: 24,
                            padding: 32,
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 20, fontWeight: '600', marginBottom: 24 }}>
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
                                        borderColor: sleepTimer === minutes ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.25)',
                                        backgroundColor: sleepTimer === minutes ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="time-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 24, fontWeight: '400', marginTop: 4 }}>
                                        {minutes}
                                    </Text>
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontWeight: '500' }}>
                                        min
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: 14, fontWeight: '500', textAlign: 'center' }}>
                            Audio will fade out gently
                        </Text>
                    </Pressable>
                </Pressable>
            )}
        </Pressable>
    );
}
