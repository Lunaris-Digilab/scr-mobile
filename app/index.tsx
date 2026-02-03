import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

export default function IndexScreen() {
  const router = useRouter();
  const { locale, isReady } = useLanguage();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setSessionChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setHasSession(!!session);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionChecked || !isReady) return;
    if (hasSession) {
      router.replace('/(tabs)/shelf');
      return;
    }
    if (!locale) {
      router.replace('/language');
    } else {
      router.replace('/login');
    }
  }, [sessionChecked, isReady, hasSession, locale, router]);

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
