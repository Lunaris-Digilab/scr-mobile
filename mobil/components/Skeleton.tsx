import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      [Colors.shimmerBase, Colors.shimmerHighlight]
    ),
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function RoutineSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Calendar card */}
      <Skeleton width="100%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
      {/* Tabs */}
      <Skeleton width="100%" height={44} borderRadius={12} style={{ marginBottom: 16 }} />
      {/* Progress card */}
      <Skeleton width="100%" height={90} borderRadius={12} style={{ marginBottom: 16 }} />
      {/* Step cards */}
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width="100%" height={84} borderRadius={12} style={{ marginBottom: 12 }} />
      ))}
    </View>
  );
}

export function ProductGridSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Search bar */}
      <Skeleton width="100%" height={48} borderRadius={12} style={{ marginBottom: 16 }} />
      {/* Category pills */}
      <View style={skeletonStyles.pillRow}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={80} height={34} borderRadius={17} />
        ))}
      </View>
      {/* Grid */}
      <View style={skeletonStyles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="48%" height={220} borderRadius={12} />
        ))}
      </View>
    </View>
  );
}

export function ShelfGridSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Tabs */}
      <Skeleton width="100%" height={44} borderRadius={12} style={{ marginBottom: 16 }} />
      {/* Grid */}
      <View style={skeletonStyles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="48%" height={200} borderRadius={12} />
        ))}
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={[skeletonStyles.container, { alignItems: 'center' }]}>
      {/* Avatar */}
      <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
      {/* Name */}
      <Skeleton width={150} height={22} borderRadius={6} style={{ marginBottom: 8 }} />
      {/* Subtitle */}
      <Skeleton width={100} height={16} borderRadius={6} style={{ marginBottom: 24 }} />
      {/* Stats row */}
      <View style={skeletonStyles.statsRow}>
        <Skeleton width="46%" height={80} borderRadius={12} />
        <Skeleton width="46%" height={80} borderRadius={12} />
      </View>
      {/* Skin profile */}
      <Skeleton width="100%" height={120} borderRadius={12} style={{ marginTop: 16 }} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
