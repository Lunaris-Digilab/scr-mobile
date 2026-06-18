import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { isOnboardingDone } from '../lib/onboarding';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';

/* Branded, on-palette loading mark shown while we decide where to route. */
function BrandLoader() {
  const scale = useSharedValue(0.9);
  const glow = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.94, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900 }),
        withTiming(0.3, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={styles.brandWrap}>
      <View style={styles.iconCircle}>
        <Animated.View style={[styles.iconGlow, glowStyle]} />
        <Animated.View style={iconStyle}>
          <Sparkles size={34} color={Colors.medium} />
        </Animated.View>
      </View>
      <Text style={styles.wordmark}>Glowist</Text>
    </View>
  );
}

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
    ]).then(([{ data: { session }, error }, done]) => {
      if (cancelled) return;
      if (error) {
        // Invalid/expired refresh token — clear the stale session
        supabase.auth.signOut().catch(() => {});
        setHasSession(false);
      } else {
        setHasSession(!!session);
      }
      setOnboardingDone(done);
      setSessionChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Refresh failed — stale token, force sign out
          supabase.auth.signOut().catch(() => {});
          setHasSession(false);
        } else {
          setHasSession(!!session);
        }
      }
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
      router.replace('/(tabs)/routine');
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
      <BrandLoader />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.mediumLight,
  },
  wordmark: {
    fontSize: 26,
    fontFamily: Typography.bold,
    color: Colors.text,
    letterSpacing: 0.5,
  },
});
