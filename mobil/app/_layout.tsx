import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { RootErrorBoundary } from '../components/RootErrorBoundary';
import { supabase } from '../lib/supabase';
import { syncAllReminders } from '../lib/reminder-settings';

function useReminderSync() {
  const { t } = useLanguage();
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      syncAllReminders(
        user.id,
        (type) => (type === 'AM' ? t('reminderMorningTitle') : t('reminderEveningTitle')),
        (type) => (type === 'AM' ? t('reminderMorningBody') : t('reminderEveningBody'))
      ).catch(() => {});
    });
  }, [t]);
}

function StackScreens() {
  const { t } = useLanguage();
  useReminderSync();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.headerBackground },
        headerTintColor: Colors.headerTint,
        headerTitleStyle: { fontFamily: Typography.semibold },
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
          name="onboarding"
          options={{ headerShown: false }}
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
            headerTitleStyle: { fontFamily: Typography.semibold, color: Colors.headerTint },
            headerBackTitle: t('productsAddBack'),
          }}
        />
        <Stack.Screen
          name="products/add"
          options={{
            title: '',
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontFamily: Typography.semibold, color: Colors.headerTint },
            headerBackTitle: t('productsAddBack'),
          }}
        />
        <Stack.Screen
          name="products/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="skin-profile"
          options={{
            title: t('skinProfile'),
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontFamily: Typography.semibold, color: Colors.headerTint },
            headerBackTitle: t('productsAddBack'),
          }}
        />
        <Stack.Screen
          name="reminder-settings"
          options={{
            title: t('reminderTitle'),
            headerStyle: { backgroundColor: Colors.headerBackground },
            headerTintColor: Colors.headerTint,
            headerTitleStyle: { fontFamily: Typography.semibold, color: Colors.headerTint },
            headerBackTitle: t('productsAddBack'),
          }}
        />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontLoadError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  if (!fontsLoaded && !fontLoadError) return null;

  return (
    <RootErrorBoundary>
      <LanguageProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StackScreens />
          <StatusBar style="dark" />
        </GestureHandlerRootView>
      </LanguageProvider>
    </RootErrorBoundary>
  );
}
