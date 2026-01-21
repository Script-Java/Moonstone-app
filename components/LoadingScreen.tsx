import { COLORS } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
    credits: number;
}

export default function LoadingScreen({ credits }: LoadingScreenProps) {
    // Animation values using React Native's built-in Animated API
    const rotation = useRef(new Animated.Value(0)).current;
    const scale1 = useRef(new Animated.Value(1)).current;
    const scale2 = useRef(new Animated.Value(1)).current;
    const sparkleOpacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Rotating animation for outer rings - continuous smooth rotation
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 12000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Breathing animation for first ring - smooth pulsing
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale1, {
                    toValue: 1.15,
                    duration: 2500,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scale1, {
                    toValue: 1,
                    duration: 2500,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Breathing animation for second ring - slightly different timing
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale2, {
                    toValue: 1.2,
                    duration: 3000,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scale2, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Sparkle twinkling animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(sparkleOpacity, {
                    toValue: 0.8,
                    duration: 1500,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(sparkleOpacity, {
                    toValue: 0.3,
                    duration: 1500,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [rotation, scale1, scale2, sparkleOpacity]);

    // Interpolate rotation value to degrees
    const rotationDegrees = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotationDegreesReverse = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-360deg'],
    });

    return (
        <View
            style={[styles.container, { backgroundColor: COLORS.background }]}
            accessibilityViewIsModal={true}
            accessible={true}
            accessibilityLabel="Loading story"
        >
            {/* Animated background */}
            <View style={[styles.gradientBg, { backgroundColor: COLORS.background }]} />

            {/* Central animation */}
            <View style={styles.animationContainer}>
                {/* Outer ring - rotates and scales */}
                <Animated.View
                    style={[
                        styles.outerRing,
                        {
                            borderColor: COLORS.primary,
                            opacity: 0.15,
                            transform: [
                                { rotate: rotationDegrees },
                                { scale: scale1 }
                            ],
                        }
                    ]}
                />

                {/* Middle ring - counter-rotates and scales */}
                <Animated.View
                    style={[
                        styles.middleRing,
                        {
                            borderColor: COLORS.primary,
                            opacity: 0.25,
                            transform: [
                                { rotate: rotationDegreesReverse },
                                { scale: scale2 }
                            ],
                        }
                    ]}
                />

                {/* Inner circle with Icon */}
                <View
                    style={[
                        styles.innerCircle,
                        {
                            backgroundColor: COLORS.surface,
                            borderColor: COLORS.primary,
                            shadowColor: COLORS.primary,
                            shadowOpacity: 0.3,
                            shadowRadius: 20,
                        }
                    ]}
                >
                    <Ionicons name="sparkles" size={56} color={COLORS.primary} />
                </View>

                {/* Decorative twinkling stars */}
                <Animated.View style={[styles.star1, { opacity: sparkleOpacity }]}>
                    <Ionicons name="star" size={10} color={COLORS.primary} style={{ opacity: 0.4 }} />
                </Animated.View>
                <Animated.View style={[styles.star2, { opacity: sparkleOpacity }]}>
                    <Ionicons name="star" size={8} color={COLORS.primary} style={{ opacity: 0.3 }} />
                </Animated.View>
                <Animated.View style={[styles.star3, { opacity: sparkleOpacity }]}>
                    <Ionicons name="star" size={12} color={COLORS.primary} style={{ opacity: 0.35 }} />
                </Animated.View>
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
                <Text style={[styles.mainText, { color: COLORS.text }]}>Crafting your tale...</Text>
                <Text style={[styles.subText, { color: COLORS.text }]}>This may take a moment</Text>
            </View>

            {/* Bottom info */}
            <View style={styles.bottomContainer}>
                <View
                    style={[
                        styles.processingBadge,
                        {
                            backgroundColor: COLORS.surface,
                            borderColor: COLORS.primary,
                        }
                    ]}
                >
                    <Ionicons name="hourglass-outline" size={16} color={COLORS.primary} />
                    <Text style={[styles.processingText, { color: COLORS.text }]}>Processing Story</Text>
                </View>
                <Text style={styles.creditsText}>
                    {credits} {credits === 1 ? 'CREDIT' : 'CREDITS'} REMAINING
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    gradientBg: {
        position: 'absolute',
        width: width * 2,
        height: height * 2,
        opacity: 0.95,
    },
    animationContainer: {
        width: 280,
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    outerRing: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 1.5,
    },
    middleRing: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 1.5,
    },
    innerCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        elevation: 10,
    },
    star1: {
        position: 'absolute',
        top: 40,
        right: 60,
    },
    star2: {
        position: 'absolute',
        bottom: 120,
        right: 30,
    },
    star3: {
        position: 'absolute',
        bottom: 180,
        left: 50,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    mainText: {
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    subText: {
        fontSize: 14,
        opacity: 0.5,
        marginTop: 8,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 80,
        alignItems: 'center',
    },
    processingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        opacity: 0.8,
    },
    processingText: {
        fontSize: 14,
        fontWeight: '600',
    },
    creditsText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 12,
    },
});
