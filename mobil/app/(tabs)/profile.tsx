import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pencil, LogOut, TrendingUp, ChevronRight, Flame, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getProgressStats } from '../../lib/progress';
import { getUserProducts } from '../../lib/user-products';
import { getCurrentUserSkinProfile, updateUserSkinProfile, type UserSkinProfile } from '../../lib/users';
import { getCurrentUserRole } from '../../lib/profile-role';
import { Colors, Gradients, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useLanguage } from '../../context/LanguageContext';
import { LOCALE_OPTIONS, type Locale } from '../../constants/translations';
import { getTranslation, getMonthsShort } from '../../constants/translations';
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

type UserProfile = {
  email: string | null;
  displayName: string;
  createdAt: string | null;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  productsCount: number;
  skinProfile: UserSkinProfile | null;
  isAdmin: boolean;
};

function formatMemberSince(createdAt: string | null, template: string, locale: Locale): string {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  const months = getMonthsShort(locale);
  const date = `${months[d.getMonth()]} ${d.getFullYear()}`;
  return template.replace('{date}', date);
}

/* ---------- Animated Counter ---------- */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function AnimatedCounter({ value, suffix }: { value: number; suffix?: string }) {
  const animVal = useSharedValue(0);

  useEffect(() => {
    animVal.value = withTiming(value, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const rounded = Math.round(animVal.value);
    return {
      text: suffix ? `${rounded} ${suffix}` : `${rounded}`,
    } as any;
  });

  return (
    <AnimatedTextInput
      style={[styles.statValue, styles.counterInput]}
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      defaultValue={suffix ? `0 ${suffix}` : '0'}
      animatedProps={animatedProps}
      accessibilityLabel={suffix ? `${value} ${suffix}` : `${value}`}
    />
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const [skinTypeSheetVisible, setSkinTypeSheetVisible] = useState(false);

  const SKIN_TYPES = [
    { value: 'Normal', labelKey: 'skinTypeNormal' as TranslationKey },
    { value: 'Dry', labelKey: 'skinTypeDry' as TranslationKey },
    { value: 'Oily', labelKey: 'skinTypeOily' as TranslationKey },
    { value: 'Combination', labelKey: 'skinTypeCombination' as TranslationKey },
    { value: 'Sensitive', labelKey: 'skinTypeSensitive' as TranslationKey },
  ];

  const handleSkinTypeChange = async (value: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await updateUserSkinProfile(user.id, { skin_type: value });
    setProfile((prev) => prev ? {
      ...prev,
      skinProfile: { ...prev.skinProfile, skin_type: value, skin_concerns: prev.skinProfile?.skin_concerns ?? [] },
    } : prev);
    haptic.success();
  };

  const getTranslatedSkinType = (value: string | null | undefined): string => {
    if (!value?.trim()) return t('addSkinType');
    const match = SKIN_TYPES.find((s) => s.value === value);
    return match ? t(match.labelKey) : value;
  };

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    try {
      const [stats, products, skinProfile, role] = await Promise.all([
        getProgressStats(user.id),
        getUserProducts(user.id),
        getCurrentUserSkinProfile(user.id),
        getCurrentUserRole(),
      ]);
      const displayName = user.user_metadata?.full_name
        ?? user.email?.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, (c) => c.toUpperCase())
        ?? 'User';
      setProfile({
        email: user.email ?? null,
        displayName,
        createdAt: user.created_at ?? null,
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        totalActiveDays: stats.totalActiveDays,
        productsCount: products.length,
        skinProfile,
        isAdmin: role === 'admin',
      });
    } catch (e) {
      console.error(e);
      setProfile({
        email: user.email ?? null,
        displayName: user.email?.split('@')[0] ?? 'User',
        createdAt: user.created_at ?? null,
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: 0,
        productsCount: 0,
        skinProfile: null,
        isAdmin: false,
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
          <Text style={styles.headerTitle}>{t('userProfile')}</Text>
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
          {profile.isAdmin && (
            <View style={styles.adminBadge}>
              <ShieldCheck size={13} color={Colors.gold} />
              <Text style={styles.adminBadgeText}>{t('profileAdminBadge')}</Text>
            </View>
          )}
          <Pressable onPress={() => { haptic.light(); setSkinTypeSheetVisible(true); }}>
            <Text style={[styles.skinType, !profile.skinProfile?.skin_type?.trim() && styles.skinTypeEmpty]}>
              {getTranslatedSkinType(profile.skinProfile?.skin_type)}
            </Text>
          </Pressable>
          <Text style={styles.memberSince}>{formatMemberSince(profile.createdAt, t('memberSince'), locale ?? 'tr')}</Text>
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

        {/* Stats with count-up — tappable into the progress dashboard */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.statsRow}>
          <Pressable
            style={styles.statCard}
            onPress={() => { haptic.light(); router.push('/progress'); }}
            accessibilityRole="button"
            accessibilityLabel={`${t('currentStreak')}: ${profile.currentStreak} ${t('days')}`}
          >
            <View style={styles.statHeaderRow}>
              <Text style={styles.statLabel}>{t('currentStreak')}</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </View>
            <AnimatedCounter value={profile.currentStreak} suffix={t('days')} />
            <View style={styles.statTrend}>
              <Flame size={12} color={Colors.gold} />
              <Text style={styles.statTrendText}>{t('longestStreak')}: {profile.longestStreak}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.statCard}
            onPress={() => { haptic.light(); router.push('/progress'); }}
            accessibilityRole="button"
            accessibilityLabel={`${t('productsUsed')}: ${profile.productsCount}`}
          >
            <View style={styles.statHeaderRow}>
              <Text style={styles.statLabel}>{t('productsUsed')}</Text>
              <ChevronRight size={16} color={Colors.textSecondary} />
            </View>
            <AnimatedCounter value={profile.productsCount} />
            <View style={styles.statTrend}>
              <TrendingUp size={12} color={Colors.primary} />
              <Text style={styles.statTrendText}>{profile.totalActiveDays} {t('totalActiveDays')}</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Skin Profile — only real, backed data */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.skinSection}>
          <Text style={styles.sectionTitle}>{t('skinProfile')}</Text>
          <View style={styles.skinCard}>
            <View style={styles.skinRow}>
              <Text style={styles.skinLabel}>{t('skinType')}</Text>
              <Text style={styles.skinValue}>
                {getTranslatedSkinType(profile.skinProfile?.skin_type)}
              </Text>
            </View>
            <View style={[styles.skinRow, styles.skinRowLast]}>
              <Text style={styles.skinLabel}>{t('primaryConcerns')}</Text>
              {translatedConcerns.length > 0 ? (
                <View style={styles.skinChipsRow}>
                  {translatedConcerns.map((label) => (
                    <View key={label} style={styles.skinChip}>
                      <Text style={styles.skinChipText}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.skinValue}>—</Text>
              )}
            </View>
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

      {/* Skin Type Bottom Sheet */}
      <BottomSheet
        visible={skinTypeSheetVisible}
        onClose={() => setSkinTypeSheetVisible(false)}
        title={t('selectSkinType')}
        actions={SKIN_TYPES.map((st) => ({
          label: t(st.labelKey),
          variant: profile.skinProfile?.skin_type === st.value ? 'primary' as const : 'default' as const,
          onPress: () => handleSkinTypeChange(st.value),
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
    alignItems: 'center',
    marginBottom: 24,
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
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.gold + '1F',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 6,
  },
  adminBadgeText: {
    fontSize: 12,
    fontFamily: Typography.semibold,
    color: Colors.gold,
    letterSpacing: 0.3,
  },
  skinType: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.primary,
    marginBottom: 4,
  },
  skinTypeEmpty: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
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
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.primary,
  },
  statValue: {
    fontSize: 22,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  counterInput: {
    padding: 0,
    margin: 0,
    height: 30,
    includeFontPadding: false,
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
