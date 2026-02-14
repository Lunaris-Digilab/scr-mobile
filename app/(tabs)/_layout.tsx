import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Calendar, Package, ShoppingBag, User } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="routine"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabIconSelected,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBackground,
          borderTopWidth: 0,
          borderRadius: 24,
          marginHorizontal: 16,
          marginBottom: Platform.OS === 'ios' ? 14 : 10,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          height: Platform.OS === 'ios' ? 86 : 68,
          position: 'absolute',
          shadowColor: '#8f5c74',
          shadowOpacity: 0.14,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontFamily: Typography.medium,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Routine',
          tabBarIcon: ({ color, size }) => (
            <Calendar color={color} size={size || 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="shelf"
        options={{
          title: 'Shelf',
          tabBarIcon: ({ color, size }) => (
            <Package color={color} size={size || 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag color={color} size={size || 24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size || 24} />
          ),
        }}
      />
    </Tabs>
  );
}
