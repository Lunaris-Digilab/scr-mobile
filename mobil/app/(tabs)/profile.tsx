import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useDerivedValue,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Pencil, LogOut, TrendingUp, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getRoutineLogDaysCount } from '../../lib/routine-logs';
import { getUserProducts } from '../../lib/user-products';
import { getCurrentUserSkinProfile, type UserSkinProfile } from '../../lib/users';
import { Colors, Gradients, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useLanguage } from '../../context/LanguageContext';
import { LOCALE_OPTIONS, type Locale } from '../../constants/translations';
import { getTranslation } from '../../constants/translations';
import type { TranslationKey } from '../../constants/translations';
import { ProfileSkeleton } from '../../components/Skeleton';
import { BottomSheet } from '../../components/BottomSheet';
import { haptic } from '../../lib/haptics';

const SKIN_CONCERN_KEYS = [
  'onboardingConcernAcne', 'onboardingConcernLines', 'onboardingConcernSensitivity',
  'onboardingConcernRedness', 'onboardingConcernDryness', 'onboardingConcernOily',
  'onboardingConcernPigmentation', 'onboardingConcernGeneral',
] as const;

function getTranslatedConcerns(enLabels: string[] | undefined, t: (k: TranslationKey) => string): string[] {
  if (!enLabels?.length) return [];
  return enLabels.map((en) => {
    const key = SKIN_CONCERN_KEYS.find((k) => getTranslation('en', k as TranslationKey) === en);
    return key ? t(key) : en;
  });
}

function formatSkinConcernsDisplay(enLabels: string[] | undefined, t: (k: TranslationKey) => string): string {
  if (!enLabels?.length) return '—';
  return getTranslatedConcerns(enLabels, t).join(', ');
}

type UserProfile = {
  email: string | null;
  displayName: string;
  createdAt: string | null;
  routineStreakDays: number;
  productsCount: number;
  skinProfile: UserSkinProfile | null;
};

type SkinRow = {
  key: string;
  labelKey: 'primaryConcerns' | 'sensitivity' | 'climate' | 'allergies';
  getValue: (profile: UserProfile, t: (k: TranslationKey) => string) => string;
};

function getSkinProfileRows(): SkinRow[] {
  return [
    { key: 'concerns', labelKey: 'primaryConcerns', getValue: (p, t) => formatSkinConcernsDisplay(p.skinProfile?.skin_concerns, t) },
    { key: 'sensitivity', labelKey: 'sensitivity', getValue: () => '—' },
    { key: 'climate', labelKey: 'climate', getValue: () => '—' },
    { key: 'allergies', labelKey: 'allergies', getValue: () => '—' },
  ];
}

function formatMemberSince(createdAt: string | null, memberSinceText: string): string {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[d.getMonth()]} ${d.getFullYear()} ${memberSinceText}`;
}

/* ---------- Animated Counter ---------- */
function AnimatedCounter({ value, suffix }: { value: number; suffix?: string }) {
  const animVal = useSharedValue(0);

  useEffect(() => {
    animVal.value = withTiming(value, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const displayVal = useDerivedValue(() => Math.round(animVal.value));

  // Using a simple approach since AnimatedText with animatedProps is complex
  return (
    <Text style={styles.statValue}>
      {value}{suffix ? ` ${suffix}` : ''}
    </Text>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    try {
      const [streakDays, products, skinProfile] = await Promise.all([
        getRoutineLogDaysCount(user.id),
        getUserProducts(user.id),
        getCurrentUserSkinProfile(user.id),
      ]);
      const displayName = user.user_metadata?.full_name
        ?? user.email?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, (c) => c.toUpperCase())
        ?? 'User';
      setProfile({
        email: user.email ?? null,
        displayName,
        createdAt: user.created_at ?? null,
        routineStreakDays: streakDays,
        productsCount: products.length,
        skinProfile,
      });
    } catch (e) {
      console.error(e);
      setProfile({
        email: user.email ?? null,
        displayName: user.email?.split('@')[0] ?? 'User',
        createdAt: user.created_at ?? null,
        routineStreakDays: 0,
        productsCount: 0,
        skinProfile: null,
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSignOut = async () => {
    haptic.medium();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ paddingTop: 60 }}>
          <ProfileSkeleton />
        </View>
      </View>
    );
  }

  const currentLocaleLabel = LOCALE_OPTIONS.find((o) => o.value === (locale ?? 'tr'))?.nativeLabel ?? 'Turkce';
  const translatedConcerns = getTranslatedConcerns(profile.skinProfile?.skin_concerns, t);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{t('userProfile')}</Text>
          <Pressable style={styles.headerIcon} hitSlop={12}>
            <Settings size={22} color={Colors.text} />
          </Pressable>
        </Animated.View>

        {/* Avatar with gradient ring */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.avatarSection}>
          <LinearGradient
            colors={[...Gradients.golden]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradientRing}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </LinearGradient>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.skinType}>
            {profile.skinProfile?.skin_type?.trim() ? profile.skinProfile.skin_type : t('addSkinType')}
          </Text>
          <Text style={styles.memberSince}>{formatMemberSince(profile.createdAt, t('memberSince'))}</Text>
        </Animated.View>

        {/* Language Row */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Pressable
            style={styles.languageRow}
            onPress={() => {
              haptic.light();
              setLanguageSheetVisible(true);
            }}
          >
            <Text style={styles.languageLabel}>{t('language')}</Text>
            <View style={styles.languageValueRow}>
              <Text style={styles.languageValue}>{currentLocaleLabel}</Text>
              <ChevronRight size={20} color={Colors.textSecondary} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Stats with count-up */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('routineStreak')}</Text>
            <AnimatedCounter value={profile.routineStreakDays} suffix={t('days')} />
            <View style={styles.statTrend}>
              <TrendingUp size={12} color={Colors.primary} />
              <Text style={styles.statTrendText}>+2%</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('productsUsed')}</Text>
            <AnimatedCounter value={profile.productsCount} />
            <Text style={styles.statTrendText}>{t('thisWeek')}</Text>
          </View>
        </Animated.View>

        {/* Skin Profile */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.skinSection}>
          <Text style={styles.sectionTitle}>{t('skinProfile')}</Text>
          <View style={styles.skinCard}>
            {getSkinProfileRows().map((row, index) => {
              const isLast = index === getSkinProfileRows().length - 1;
              const isConcerns = row.key === 'concerns';
              return (
                <View key={row.key} style={[styles.skinRow, isLast && styles.skinRowLast]}>
                  <Text style={styles.skinLabel}>{t(row.labelKey)}</Text>
                  {isConcerns && translatedConcerns.length > 0 ? (
                    <View style={styles.skinChipsRow}>
                      {translatedConcerns.map((label) => (
                        <View key={label} style={styles.skinChip}>
                          <Text style={styles.skinChipText}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.skinValue}>{row.getValue(profile, t)}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(400)}>
          <Pressable
            style={styles.updateButton}
            onPress={() => {
              haptic.light();
              router.push('/skin-profile');
            }}
          >
            <Pencil size={18} color={Colors.white} />
            <Text style={styles.updateButtonText}>{t('updateProfileSurvey')}</Text>
          </Pressable>

          <Pressable style={styles.logOutButton} onPress={handleSignOut}>
            <LogOut size={18} color={Colors.error} />
            <Text style={styles.logOutText}>{t('signOut')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Language Bottom Sheet */}
      <BottomSheet
        visible={languageSheetVisible}
        onClose={() => setLanguageSheetVisible(false)}
        title={t('changeLanguage')}
        actions={LOCALE_OPTIONS.map((opt) => ({
          label: `${opt.nativeLabel} (${opt.label})`,
          variant: (locale ?? 'tr') === opt.value ? 'primary' as const : 'default' as const,
          onPress: async () => {
            await setLocale(opt.value as Locale);
            haptic.success();
          },
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Typography.bold,
    color: Colors.text,
  },

  /* Avatar */
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarGradientRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontFamily: Typography.bold,
    color: Colors.primary,
  },
  displayName: {
    fontSize: 22,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  skinType: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.primary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },

  /* Language */
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    ...Shadows.card,
  },
  languageLabel: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.text,
  },
  languageValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageValue: {
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    ...Shadows.card,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.primary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.primary,
  },

  /* Skin Profile */
  skinSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  skinCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...Shadows.card,
  },
  skinRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  skinRowLast: {
    borderBottomWidth: 0,
  },
  skinLabel: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.primary,
  },
  skinValue: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Colors.text,
  },
  skinChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skinChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.lightGray,
  },
  skinChipText: {
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.text,
  },

  /* Buttons */
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
    ...Shadows.card,
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.white,
  },
  logOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.error,
    gap: 8,
  },
  logOutText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.error,
  },
});
