import { View, Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';

// Emoji tab icons avoid "Unable to save asset to directory" in Expo Go on iOS
// (Ionicons font fails to cache in simulator @anonymous path). Use
// `npx expo run:ios` for a dev build if you want vector icons back.

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="shelf"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1f2937',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#f3f4f6',
          borderTopColor: '#e5e7eb',
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Routine',
          tabBarIcon: () => <Text style={styles.tabEmoji}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="shelf"
        options={{
          title: 'Shelf',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Text style={styles.tabEmoji}>📦</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: () => <Text style={styles.tabEmoji}>🛒</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={styles.tabEmoji}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabEmoji: {
    fontSize: 22,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#fce7f3',
  },
});
