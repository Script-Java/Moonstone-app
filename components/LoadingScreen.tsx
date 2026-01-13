import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import Logo from '@/components/Logo';

const { width, height } = Dimensions.get('window');

interface LoadingScreenProps {
    credits: number;
}

export default function LoadingScreen({ credits }: LoadingScreenProps) {
    // Animation values
    const rotation = useSharedValue(0);
    const scale1 = useSharedValue(1);
    const scale2 = useSharedValue(1);
    const sparkleOpacity = useSharedValue(0.5);

    useEffect(() => {
        // Rotating animation for outer rings
        rotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1,
            false
        );

        // Pulsing animation for first ring
        scale1.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        // Pulsing animation for second ring (offset)
        scale2.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        // Sparkle twinkle
        sparkleOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, []);

    const outerRingStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }, { scale: scale1.value }],
    }));

    const middleRingStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${-rotation.value}deg` }, { scale: scale2.value }],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        opacity: sparkleOpacity.value,
    }));

    return (
        <View
            style={styles.container}
            accessibilityViewIsModal={true}
            accessible={true}
            accessibilityLabel="Loading story"
        >
            {/* Animated background gradient effect */}
            <View style={styles.gradientBg} />

            {/* Central animation */}
            <View style={styles.animationContainer}>
                {/* Outer ring */}
                <Animated.View style={[styles.outerRing, outerRingStyle]} />

                {/* Middle ring */}
                <Animated.View style={[styles.middleRing, middleRingStyle]} />

                {/* Inner circle with logo */}
                <View style={styles.innerCircle}>
                    <Logo size="medium" animated={true} glow={true} />
                </View>

                {/* Decorative stars in corners */}
                <View style={styles.star1}>
                    <Ionicons name="star" size={4} color="rgba(255,255,255,0.4)" />
                </View>
                <View style={styles.star2}>
                    <Ionicons name="star" size={3} color="rgba(255,255,255,0.3)" />
                </View>
                <View style={styles.star3}>
                    <Ionicons name="star" size={4} color="rgba(255,255,255,0.35)" />
                </View>
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
                <Text style={styles.mainText}>Crafting your tale...</Text>
                <Text style={styles.subText}>This may take a moment</Text>
            </View>

            {/* Bottom info */}
            <View style={styles.bottomContainer}>
                <View style={styles.processingBadge}>
                    <Ionicons name="hourglass-outline" size={16} color="#8e2de2" />
                    <Text style={styles.processingText}>Processing Story</Text>
                </View>
                <Text style={styles.creditsText}>{credits} {credits === 1 ? 'CREDIT' : 'CREDITS'} REMAINING</Text>
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
        backgroundColor: '#1a0a2e',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    gradientBg: {
        position: 'absolute',
        width: width * 2,
        height: height * 2,
        backgroundColor: '#1a0a2e',
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
        borderColor: 'rgba(142, 45, 226, 0.15)',
    },
    middleRing: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 1.5,
        borderColor: 'rgba(142, 45, 226, 0.25)',
    },
    innerCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(30, 15, 50, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(142, 45, 226, 0.3)',
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
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    subText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.4)',
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
        backgroundColor: 'rgba(142, 45, 226, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(142, 45, 226, 0.3)',
    },
    processingText: {
        color: 'rgba(255, 255, 255, 0.8)',
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
