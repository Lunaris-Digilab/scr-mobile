import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import {
  getOrCreateRoutine,
  removeStepFromRoutine,
} from '../lib/routines';
import { getTodayLog, upsertTodayLog } from '../lib/routine-logs';
import type { RoutineStep, RoutineType } from '../types/routine';

const ROUTINE_TYPES: { key: RoutineType; label: string; icon: string }[] = [
  { key: 'AM', label: 'Sabah', icon: '☀' },
  { key: 'PM', label: 'Akşam', icon: '🌙' },
];

export default function RoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<RoutineType>('AM');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadCompletedSteps = useCallback(async (uid: string, rid: string) => {
    try {
      const ids = await getTodayLog(uid, rid);
      setCompletedStepIds(ids);
    } catch {
      setCompletedStepIds([]);
    }
  }, []);

  const saveCompletedSteps = useCallback(
    async (uid: string, rid: string, ids: string[]) => {
      setCompletedStepIds(ids);
      try {
        await upsertTodayLog(uid, rid, ids);
      } catch (e) {
        console.error(e);
        Alert.alert('Hata', 'Tamamlama kaydedilemedi.');
      }
    },
    []
  );

  const loadRoutine = useCallback(
    async (uid: string, type: RoutineType, email?: string) => {
      try {
        const routine = await getOrCreateRoutine(uid, type, email);
        setRoutineId(routine.id);
        setSteps(routine.steps ?? []);
        await loadCompletedSteps(uid, routine.id);
      } catch (e) {
        console.error(e);
        Alert.alert('Hata', 'Rutin yüklenemedi.');
      } finally {
        setLoading(false);
      }
    },
    [loadCompletedSteps]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);
      loadRoutine(user.id, activeTab, user.email ?? undefined);
    });
  }, [activeTab, loadRoutine, router]);

  useFocusEffect(
    useCallback(() => {
      if (userId && routineId) {
        loadRoutine(userId, activeTab);
      }
    }, [userId, routineId, activeTab, loadRoutine])
  );

  const handleTabChange = (type: RoutineType) => {
    if (type === activeTab) return;
    setLoading(true);
    setActiveTab(type);
    if (userId) loadRoutine(userId, type); // email optional on refetch
  };

  const handleDeleteStep = (stepId: string) => {
    if (!routineId) return;
    Alert.alert('Adımı sil', 'Bu ürünü rutinden kaldırmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          try {
            await removeStepFromRoutine(routineId, stepId);
            setSteps((prev) => prev.filter((s) => s.id !== stepId));
            const nextCompleted = completedStepIds.filter((id) => id !== stepId);
            await saveCompletedSteps(userId, routineId, nextCompleted);
          } catch (e) {
            Alert.alert('Hata', 'Silinemedi.');
          }
        },
      },
    ]);
  };

  const handleToggleComplete = (stepId: string) => {
    if (!routineId || !userId) return;
    const next = completedStepIds.includes(stepId)
      ? completedStepIds.filter((id) => id !== stepId)
      : [...completedStepIds, stepId];
    saveCompletedSteps(userId, routineId, next);
  };

  const completedCount = completedStepIds.length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  if (!userId && !loading) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>Daily Routine</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Günlük Rutin</Text>
          {totalSteps > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>Rutin</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        {ROUTINE_TYPES.map(({ key, label, icon }) => (
          <Pressable
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => handleTabChange(key)}
          >
            <Text style={styles.tabIcon}>{icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === key && styles.tabLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {totalSteps > 0 && (
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>İLERLEME</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {completedCount} / {totalSteps} adım tamamlandı
              </Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#ec4899" />
          </View>
        ) : (
          <View style={styles.listCard}>
            {steps.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text style={styles.emptyText}>
                  Henüz ürün eklemediniz. + ile ekleyin.
                </Text>
              </View>
            ) : (
              steps
                .sort((a, b) => a.order - b.order)
                .map((step, index) => {
                  const isCompleted = completedStepIds.includes(step.id);
                  return (
                    <View key={step.id} style={styles.stepRow}>
                      <Pressable
                        style={styles.stepRowContent}
                        onPress={() => {
                          if (!routineId) return;
                          router.push({
                            pathname: '/routine/add-step',
                            params: {
                              routineId,
                              type: activeTab,
                              stepId: step.id,
                              name: step.name,
                              description: step.description ?? '',
                            },
                          });
                        }}
                        onLongPress={() => handleDeleteStep(step.id)}
                      >
                        <View style={styles.stepImageWrap}>
                          <View style={styles.stepImagePlaceholder} />
                          <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>{index + 1}</Text>
                          </View>
                        </View>
                        <View style={styles.stepBody}>
                          <Text style={styles.stepName}>{step.name}</Text>
                          <Text style={styles.stepDesc} numberOfLines={1}>
                            {step.description || 'Ürün'} • Adım {index + 1}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        style={styles.stepCheckWrap}
                        onPress={() => handleToggleComplete(step.id)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        {isCompleted ? (
                          <View style={styles.stepCheckDone}>
                            <Text style={styles.stepCheckIcon}>✓</Text>
                          </View>
                        ) : (
                          <View style={styles.stepCheckEmpty} />
                        )}
                      </Pressable>
                    </View>
                  );
                })
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.fab,
          { bottom: insets.bottom + 24 },
          !routineId && styles.fabDisabled,
        ]}
        onPress={() => {
          if (!routineId) return;
          router.push({
            pathname: '/routine/add-step',
            params: { routineId, type: activeTab },
          });
        }}
        disabled={!routineId}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ef',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fce7f3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ec4899',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#fce7f3',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#1f2937',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#1f2937',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ec4899',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ec4899',
    borderRadius: 4,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stepRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepImageWrap: {
    width: 56,
    height: 56,
    marginRight: 12,
    position: 'relative',
  },
  stepImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
  },
  stepBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  stepBody: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: '#6b7280',
  },
  stepCheckWrap: {
    marginLeft: 12,
    padding: 4,
  },
  stepCheckEmpty: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  stepCheckDone: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    lineHeight: 32,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
