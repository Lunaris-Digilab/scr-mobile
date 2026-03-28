import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Pencil, LogOut, TrendingUp, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getRoutineLogDaysCount } from '../../lib/routine-logs';
import { getUserProducts } from '../../lib/user-products';
import { getCurrentUserSkinProfile, type UserSkinProfile } from '../../lib/users';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import { LOCALE_OPTIONS, type Locale } from '../../constants/translations';
import { getTranslation } from '../../constants/translations';
import type { TranslationKey } from '../../constants/translations';

const SKIN_CONCERN_KEYS = [
  'onboardingConcernAcne',
  'onboardingConcernLines',
  'onboardingConcernSensitivity',
  'onboardingConcernRedness',
  'onboardingConcernDryness',
  'onboardingConcernOily',
  'onboardingConcernPigmentation',
  'onboardingConcernGeneral',
] as const;

function getTranslatedConcerns(
  enLabels: string[] | undefined,
  t: (k: TranslationKey) => string
): string[] {
  if (!enLabels?.length) return [];
  return enLabels.map((en) => {
    const key = SKIN_CONCERN_KEYS.find(
      (k) => getTranslation('en', k as TranslationKey) === en
    );
    return key ? t(key) : en;
  });
}

function formatSkinConcernsDisplay(
  enLabels: string[] | undefined,
  t: (k: TranslationKey) => string
): string {
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

type SkinRow = { key: string; labelKey: 'primaryConcerns' | 'sensitivity' | 'climate' | 'allergies'; getValue: (profile: UserProfile, t: (k: TranslationKey) => string) => string };

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
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[d.getMonth()]} ${d.getFullYear()} ${memberSinceText}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

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
        ?? 'Kullanıcı';
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
        displayName: user.email?.split('@')[0] ?? 'Kullanıcı',
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
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading || !profile) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentLocaleLabel = LOCALE_OPTIONS.find((o) => o.value === (locale ?? 'tr'))?.nativeLabel ?? 'Türkçe';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{t('userProfile')}</Text>
          <Pressable style={styles.headerIcon} hitSlop={12}>
            <Settings size={22} color={Colors.text} />
          </Pressable>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {profile.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.skinType}>
            {profile.skinProfile?.skin_type?.trim() ? profile.skinProfile.skin_type : t('addSkinType')}
          </Text>
          <Text style={styles.memberSince}>{formatMemberSince(profile.createdAt, t('memberSince'))}</Text>
        </View>

        <Pressable style={styles.languageRow} onPress={() => setLanguageModalVisible(true)}>
          <Text style={styles.languageLabel}>{t('language')}</Text>
          <View style={styles.languageValueRow}>
            <Text style={styles.languageValue}>{currentLocaleLabel}</Text>
            <ChevronRight size={20} color={Colors.textSecondary} />
          </View>
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('routineStreak')}</Text>
            <Text style={styles.statValue}>{profile.routineStreakDays} {t('days')}</Text>
            <View style={styles.statTrend}>
              <TrendingUp size={12} color={Colors.primary} />
              <Text style={styles.statTrendText}>+2%</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('productsUsed')}</Text>
            <Text style={styles.statValue}>{profile.productsCount}</Text>
            <Text style={styles.statTrendText}>{t('thisWeek')}</Text>
          </View>
        </View>

        <View style={styles.skinSection}>
          <Text style={styles.sectionTitle}>{t('skinProfile')}</Text>
          <View style={styles.skinCard}>
            {(() => {
              const rows = getSkinProfileRows();
              return rows.map((row, index) => {
                const isLast = index === rows.length - 1;
                const isConcerns = row.key === 'concerns';
                const translatedConcerns = isConcerns
                  ? getTranslatedConcerns(profile.skinProfile?.skin_concerns, t)
                  : [];
                return (
                  <View
                    key={row.key}
                    style={[
                      styles.skinRow,
                      isLast && styles.skinRowLast,
                    ]}
                  >
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
              });
            })()}
          </View>
        </View>

        <Pressable style={styles.updateButton} onPress={() => router.push('/skin-profile')}>
          <Pencil size={18} color={Colors.white} />
          <Text style={styles.updateButtonText}>{t('updateProfileSurvey')}</Text>
        </Pressable>

        <Pressable style={styles.logOutButton} onPress={handleSignOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.logOutText}>{t('signOut')}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLanguageModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('changeLanguage')}</Text>
            {LOCALE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.modalOption, (locale ?? 'tr') === opt.value && styles.modalOptionSelected]}
                onPress={async () => {
                  await setLocale(opt.value as Locale);
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionNative}>{opt.nativeLabel}</Text>
                <Text style={styles.modalOptionEnglish}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalClose} onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.modalCloseText}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    fontWeight: '700',
    color: Colors.text,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.primary,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  skinType: {
    fontSize: 15,
    color: Colors.primary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  languageValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageValue: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statTrendText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  skinSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  skinCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
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
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'none',
  },
  skinValue: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  skinChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skinChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.lightGray,
  },
  skinChipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  logOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    gap: 8,
  },
  logOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 16,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalOptionSelected: {
    backgroundColor: Colors.light,
  },
  modalOptionNative: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modalOptionEnglish: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
