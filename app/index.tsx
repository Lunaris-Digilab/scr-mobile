import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace('/login');
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
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (checking) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bismillahirrahmanirrahim</Text>
      <Text style={styles.subtext}>Giriş yaptınız</Text>
      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push('/routine')}
      >
        <Text style={styles.buttonText}>Günlük Rutin</Text>
      </Pressable>
      <Pressable
        style={styles.primaryButton}
        onPress={() => router.push('/products')}
      >
        <Text style={styles.buttonText}>Ürünler</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Çıkış Yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#ec4899',
    borderRadius: 10,
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});
