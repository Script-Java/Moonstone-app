import React, { useEffect } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface LogoProps {
    size?: 'small' | 'medium' | 'large';
    animated?: boolean;
    glow?: boolean;
}

const SIZES = {
    small: { width: 200, height: 130 },
    medium: { width: 240, height: 156 }, // ~1.54 aspect ratio
    large: { width: 300, height: 195 },
};

export default function Logo({ size = 'medium', animated = false, glow = false }: LogoProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Fade in animation
        opacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) });

        // Pulse animation if enabled
        if (animated) {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );
        }
    }, [animated]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const logoSize = SIZES[size];

    return (
        <Animated.View style={animatedStyle}>
            <View style={styles.container}>
                <Image
                    source={require('@/assets/images/moonstone-logo.png')}
                    style={{ width: logoSize.width, height: logoSize.height }}
                    resizeMode="contain"
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
