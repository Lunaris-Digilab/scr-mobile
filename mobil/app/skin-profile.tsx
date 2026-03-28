import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getCurrentUserSkinProfile, updateUserSkinProfile } from '../lib/users';
import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../constants/translations';
import type { TranslationKey } from '../constants/translations';
import { Colors } from '../constants/Colors';
import {
  Check,
  Droplets,
  Flame,
  Sun,
  Heart,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';

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

const CONCERN_ICONS = [
  Droplets,
  Sparkles,
  Flame,
  Flame,
  Droplets,
  Sun,
  Sparkles,
  Heart,
];

function indicesFromStoredConcerns(stored: string[]): Set<number> {
  const set = new Set<number>();
  for (let i = 0; i < SKIN_CONCERN_KEYS.length; i++) {
    const enLabel = getTranslation('en', SKIN_CONCERN_KEYS[i] as TranslationKey);
    if (stored.includes(enLabel)) set.add(i);
  }
  return set;
}

function concernsFromIndices(indices: Set<number>): string[] {
  return Array.from(indices)
    .sort((a, b) => a - b)
    .map((i) => getTranslation('en', SKIN_CONCERN_KEYS[i] as TranslationKey));
}

export default function SkinProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedConcerns, setSelectedConcerns] = useState<Set<number>>(new Set());

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    const profile = await getCurrentUserSkinProfile(user.id);
    if (profile?.skin_concerns?.length) {
      setSelectedConcerns(indicesFromStoredConcerns(profile.skin_concerns));
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const toggleConcern = (index: number) => {
    setSelectedConcerns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const skin_concerns = concernsFromIndices(selectedConcerns);
    const { error } = await updateUserSkinProfile(user.id, { skin_concerns });
    setSaving(false);
    if (error) {
      Alert.alert(t('error'), error.message);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('onboardingSkinFocus')}</Text>
        <View style={styles.list}>
          {SKIN_CONCERN_KEYS.map((key, index) => {
            const Icon = CONCERN_ICONS[index];
            const selected = selectedConcerns.has(index);
            return (
              <Pressable
                key={key}
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => toggleConcern(index)}
              >
                <Icon size={22} color={selected ? Colors.white : Colors.textSecondary} />
                <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                  {t(key)}
                </Text>
                <View style={[styles.check, selected && styles.checkSelected]}>
                  {selected ? <Check size={14} color={Colors.white} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Text style={styles.saveButtonText}>{t('save')}</Text>
              <ChevronRight size={20} color={Colors.white} />
            </>
          )}
        </Pressable>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    lineHeight: 30,
  },
  list: {
    gap: 10,
    marginBottom: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 12,
  },
  itemSelected: {
    backgroundColor: Colors.mediumLight,
    borderColor: Colors.medium,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  itemTextSelected: {
    color: Colors.text,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
});
