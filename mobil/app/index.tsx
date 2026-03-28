import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { isOnboardingDone } from '../lib/onboarding';

export default function IndexScreen() {
  const router = useRouter();
  const { locale, isReady } = useLanguage();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Session + onboarding durumunu birlikte yükle (yarışı önlemek için)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.auth.getSession(),
      isOnboardingDone(),
    ]).then(([{ data: { session } }, done]) => {
      if (cancelled) return;
      setHasSession(!!session);
      setOnboardingDone(done);
      setSessionChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setHasSession(!!session)
    );
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Yönlendirme: tüm veriler hazır olunca tek seferde karar ver
  useEffect(() => {
    if (!sessionChecked || onboardingDone === null || !isReady) return;

    if (hasSession) {
      router.replace('/(tabs)/shelf');
      return;
    }

    if (!onboardingDone) {
      router.replace('/onboarding');
      return;
    }
    if (!locale) {
      router.replace('/language');
      return;
    }
    router.replace('/login');
  }, [sessionChecked, hasSession, onboardingDone, isReady, locale, router]);

  return (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color="#ec4899" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ef',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
