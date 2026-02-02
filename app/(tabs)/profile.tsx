import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, Pencil, LogOut, TrendingUp } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { getRoutineLogDaysCount } from '../../lib/routine-logs';
import { getUserProducts } from '../../lib/user-products';
import { Colors } from '../../constants/Colors';

type UserProfile = {
  email: string | null;
  displayName: string;
  createdAt: string | null;
  routineStreakDays: number;
  productsCount: number;
};

const SKIN_PROFILE_ROWS: { key: string; label: string; value: string }[] = [
  { key: 'concerns', label: 'Birincil Endişeler', value: 'Akne, Leke' },
  { key: 'sensitivity', label: 'Hassasiyet', value: 'Hassas' },
  { key: 'climate', label: 'İklim', value: 'Nemli / Tropikal' },
  { key: 'allergies', label: 'Alerjiler', value: 'Paraben, Parfüm' },
];

function formatMemberSince(createdAt: string | null): string {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${months[d.getMonth()]} ${d.getFullYear()} tarihinden beri üye`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace('/login');
      return;
    }
    try {
      const [streakDays, products] = await Promise.all([
        getRoutineLogDaysCount(user.id),
        getUserProducts(user.id),
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
      });
    } catch (e) {
      console.error(e);
      setProfile({
        email: user.email ?? null,
        displayName: user.email?.split('@')[0] ?? 'Kullanıcı',
        createdAt: user.created_at ?? null,
        routineStreakDays: 0,
        productsCount: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon} />
          <Text style={styles.headerTitle}>User Profile</Text>
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
          <Text style={styles.skinType}>Cilt tipi ekleyin</Text>
          <Text style={styles.memberSince}>{formatMemberSince(profile.createdAt)}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rutin Serisi</Text>
            <Text style={styles.statValue}>{profile.routineStreakDays} Gün</Text>
            <View style={styles.statTrend}>
              <TrendingUp size={12} color={Colors.primary} />
              <Text style={styles.statTrendText}>+2%</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Kullanılan Ürün</Text>
            <Text style={styles.statValue}>{profile.productsCount}</Text>
            <Text style={styles.statTrendText}>+ bu hafta</Text>
          </View>
        </View>

        <View style={styles.skinSection}>
          <Text style={styles.sectionTitle}>Cilt Profilim</Text>
          <View style={styles.skinCard}>
            {SKIN_PROFILE_ROWS.map((row, index) => (
              <View
                key={row.key}
                style={[
                  styles.skinRow,
                  index === SKIN_PROFILE_ROWS.length - 1 && styles.skinRowLast,
                ]}
              >
                <Text style={styles.skinLabel}>{row.label}</Text>
                <Text style={styles.skinValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.updateButton}>
          <Pencil size={18} color={Colors.white} />
          <Text style={styles.updateButtonText}>Profil Anketini Güncelle</Text>
        </Pressable>

        <Pressable style={styles.logOutButton} onPress={handleSignOut}>
          <LogOut size={18} color={Colors.error} />
          <Text style={styles.logOutText}>Çıkış Yap</Text>
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
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
  },
  skinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  skinRowLast: {
    borderBottomWidth: 0,
  },
  skinLabel: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  skinValue: {
    fontSize: 14,
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
});
