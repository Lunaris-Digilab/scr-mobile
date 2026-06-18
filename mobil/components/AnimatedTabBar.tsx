import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Package, ShoppingBag, User, type LucideIcon } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { haptic } from '../lib/haptics';

const TAB_ICONS: LucideIcon[] = [Calendar, Package, ShoppingBag, User];
const SPRING_CONFIG = { damping: 18, stiffness: 120, mass: 0.8 };
const BOUNCE_CONFIG = { damping: 12, stiffness: 200 };
const PILL_INSET = 6;

/* ---------- Single tab (owns its own animation hooks) ---------- */
function TabBarItem({
  label,
  Icon,
  isFocused,
  onPress,
  onLayout,
}: {
  label: string;
  Icon: LucideIcon;
  isFocused: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isFocused) {
      scale.value = withSequence(
        withSpring(1.2, BOUNCE_CONFIG),
        withSpring(1, BOUNCE_CONFIG)
      );
    }
  }, [isFocused]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Icon size={22} color={isFocused ? Colors.text : Colors.tabIconDefault} />
      </Animated.View>
      <Animated.Text style={[styles.label, isFocused && styles.labelActive]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabWidths = React.useRef<number[]>([]);
  const tabPositions = React.useRef<number[]>([]);
  const pillLeft = useSharedValue(0);
  const pillWidth = useSharedValue(0);

  useEffect(() => {
    if (tabPositions.current[state.index] !== undefined) {
      pillLeft.value = withSpring(tabPositions.current[state.index], SPRING_CONFIG);
      pillWidth.value = withSpring(tabWidths.current[state.index], SPRING_CONFIG);
    }
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    left: pillLeft.value + PILL_INSET,
    width: pillWidth.value - PILL_INSET * 2,
  }));

  const handleTabLayout = (index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabPositions.current[index] = x;
    tabWidths.current[index] = width;
    if (index === state.index) {
      pillLeft.value = x;
      pillWidth.value = width;
    }
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View style={styles.tabRow}>
        <Animated.View style={[styles.pill, pillStyle]} />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.title ?? route.name) as string;
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[index] ?? Calendar;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              haptic.light();
              navigation.navigate(route.name);
            }
          };

          return (
            <TabBarItem
              key={route.key}
              label={label}
              Icon={Icon}
              isFocused={isFocused}
              onPress={onPress}
              onLayout={(e) => handleTabLayout(index, e)}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.tabBarBackground,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: Colors.shadowTint,
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  pill: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    backgroundColor: Colors.medium + '20',
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: Typography.medium,
    color: Colors.tabIconDefault,
  },
  labelActive: {
    color: Colors.text,
    fontFamily: Typography.semibold,
  },
});
