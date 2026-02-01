import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function IndexScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace('/login');
        } else {
          router.replace('/(tabs)/shelf');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setChecking(false);
      if (!session) {
        router.replace('/login');
      } else {
        router.replace('/(tabs)/shelf');
      }
    });
  }, [router]);

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
