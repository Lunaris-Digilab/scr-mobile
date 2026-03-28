import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gradients } from '../constants/Colors';
import { haptic } from '../lib/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 30;
const DURATION = 1500;

const COLORS = Gradients.celebration;

interface Particle {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  rotation: SharedValue<number>;
  color: string;
  size: number;
}

function createParticle(index: number): {
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  delay: number;
} {
  const angle = (index / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5);
  const distance = 100 + Math.random() * 200;
  return {
    targetX: Math.cos(angle) * distance,
    targetY: Math.sin(angle) * distance - 150 - Math.random() * 100,
    color: COLORS[index % COLORS.length],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 200,
  };
}

function ParticleView({ particle }: { particle: Particle }) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.x.value },
      { translateY: particle.y.value },
      { scale: particle.scale.value },
      { rotate: `${particle.rotation.value}deg` },
    ],
    opacity: particle.opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

interface CelebrationOverlayProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function CelebrationOverlay({ trigger, onComplete }: CelebrationOverlayProps) {
  const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const config = createParticle(i);
    return {
      x: useSharedValue(0),
      y: useSharedValue(0),
      opacity: useSharedValue(0),
      scale: useSharedValue(0),
      rotation: useSharedValue(0),
      color: config.color,
      size: config.size,
    };
  });

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!trigger) return;

    haptic.success();

    particles.forEach((particle, i) => {
      const config = createParticle(i);

      particle.x.value = 0;
      particle.y.value = 0;
      particle.opacity.value = 0;
      particle.scale.value = 0;
      particle.rotation.value = 0;

      particle.opacity.value = withDelay(
        config.delay,
        withTiming(1, { duration: 200 }, () => {
          particle.opacity.value = withDelay(
            DURATION - 500,
            withTiming(0, { duration: 300 })
          );
        })
      );

      particle.scale.value = withDelay(
        config.delay,
        withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) })
      );

      particle.x.value = withDelay(
        config.delay,
        withTiming(config.targetX, {
          duration: DURATION,
          easing: Easing.out(Easing.cubic),
        })
      );

      particle.y.value = withDelay(
        config.delay,
        withTiming(config.targetY, {
          duration: DURATION,
          easing: Easing.out(Easing.cubic),
        })
      );

      particle.rotation.value = withDelay(
        config.delay,
        withTiming(360 + Math.random() * 360, {
          duration: DURATION,
          easing: Easing.out(Easing.cubic),
        })
      );

      if (i === 0) {
        particle.opacity.value = withDelay(
          config.delay,
          withTiming(1, { duration: 200 }, () => {
            particle.opacity.value = withDelay(
              DURATION - 500,
              withTiming(0, { duration: 300 }, () => {
                runOnJS(handleComplete)();
              })
            );
          })
        );
      }
    });
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.center}>
        {particles.map((particle, i) => (
          <ParticleView key={i} particle={particle} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  center: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.35,
    left: SCREEN_WIDTH / 2,
  },
  particle: {
    position: 'absolute',
  },
});
