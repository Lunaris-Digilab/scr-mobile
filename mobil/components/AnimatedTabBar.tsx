import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet, Platform, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Package, ShoppingBag, User } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { haptic } from '../lib/haptics';

const TAB_ICONS = [Calendar, Package, ShoppingBag, User];
const SPRING_CONFIG = { damping: 18, stiffness: 120, mass: 0.8 };
const BOUNCE_CONFIG = { damping: 12, stiffness: 200 };

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabWidths = React.useRef<number[]>([]);
  const tabPositions = React.useRef<number[]>([]);
  const pillLeft = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const iconScales = state.routes.map(() => useSharedValue(1));

  useEffect(() => {
    if (tabPositions.current[state.index] !== undefined) {
      pillLeft.value = withSpring(tabPositions.current[state.index], SPRING_CONFIG);
      pillWidth.value = withSpring(tabWidths.current[state.index], SPRING_CONFIG);
    }
    iconScales[state.index].value = withSequence(
      withSpring(1.2, BOUNCE_CONFIG),
      withSpring(1, BOUNCE_CONFIG)
    );
  }, [state.index]);

  const pillStyle = useAnimatedStyle(() => ({
    left: pillLeft.value,
    width: pillWidth.value,
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
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
        },
      ]}
    >
      <View style={styles.tabRow}>
        <Animated.View style={[styles.pill, pillStyle]} />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const isFocused = state.index === index;
          const Icon = TAB_ICONS[index];

          const iconAnimatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: iconScales[index].value }],
          }));

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
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              onLayout={(e) => handleTabLayout(index, e)}
            >
              <Animated.View style={iconAnimatedStyle}>
                <Icon
                  size={22}
                  color={isFocused ? Colors.text : Colors.tabIconDefault}
                />
              </Animated.View>
              <Animated.Text
                style={[
                  styles.label,
                  isFocused && styles.labelActive,
                ]}
              >
                {label}
              </Animated.Text>
            </Pressable>
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
    shadowColor: '#8f5c74',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
  },
  pill: {
    position: 'absolute',
    top: 6,
    height: '80%',
    backgroundColor: Colors.medium + '30',
    borderRadius: 20,
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
