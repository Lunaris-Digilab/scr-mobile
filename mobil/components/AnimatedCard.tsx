import React from 'react';
import { Pressable, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.5 };

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}

export function AnimatedCard({ children, style, onPress, onLongPress, disabled }: AnimatedCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, SPRING_CONFIG);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING_CONFIG);
        }}
        onPress={() => {
          if (disabled) return;
          haptic.light();
          onPress?.();
        }}
        onLongPress={() => {
          if (disabled) return;
          haptic.medium();
          onLongPress?.();
        }}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
