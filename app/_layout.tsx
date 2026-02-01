import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '../constants/Colors';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.headerBackground },
          headerTintColor: Colors.headerTint,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false, // Optional: for cleaner look
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="login"
          options={{ 
            title: 'Giriş Yap', 
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: Colors.background }, // Match background
          }}
        />
        <Stack.Screen
          name="register"
          options={{ 
            title: 'Kayıt Ol', 
            headerBackTitle: 'Geri',
            headerStyle: { backgroundColor: Colors.background },
          }}
        />
        <Stack.Screen
          name="routine/add-step"
          options={{
            title: 'Ürün Ekle',
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontWeight: '600', color: Colors.headerTint },
            headerBackTitle: 'Geri',
          }}
        />
        <Stack.Screen
          name="products/add"
          options={{
            title: 'Ürün Ekle',
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontWeight: '600', color: Colors.headerTint },
            headerBackTitle: 'Geri',
          }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
