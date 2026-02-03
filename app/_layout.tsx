import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '../constants/Colors';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';

function StackScreens() {
  const { t } = useLanguage();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.headerBackground },
        headerTintColor: Colors.headerTint,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
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
          title: t('login'),
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: Colors.background },
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: t('register'),
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: Colors.background },
        }}
      />
        <Stack.Screen
          name="language"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="routine/add-step"
          options={{
            title: t('addProductTitle'),
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontWeight: '600', color: Colors.headerTint },
            headerBackTitle: t('productsAddBack'),
          }}
        />
        <Stack.Screen
          name="products/add"
          options={{
            title: '',
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontWeight: '600', color: Colors.headerTint },
            headerBackTitle: t('productsAddBack'),
          }}
        />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StackScreens />
        <StatusBar style="dark" />
      </GestureHandlerRootView>
    </LanguageProvider>
  );
}
