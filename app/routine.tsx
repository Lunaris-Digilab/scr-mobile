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
  updateRoutineSteps,
  generateUuid,
} from '../lib/routines';
import { getTodayLog, upsertTodayLog, isValidUuid } from '../lib/routine-logs';
import type { RoutineStep, RoutineType } from '../types/routine';
import { Colors } from '../constants/Colors';

import { Sun, Moon, Flame, Sparkles, Check, Plus } from 'lucide-react-native';

const ROUTINE_TYPES: { key: RoutineType; label: string; Icon: typeof Sun }[] = [
  { key: 'AM', label: 'Sabah', Icon: Sun },
  { key: 'PM', label: 'Akşam', Icon: Moon },
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
        let stepsToSet = routine.steps ?? [];
        // Eski "step-xxx" id'leri UUID değil; routine_logs.completed_steps uuid[] kabul ediyor.
        // UUID olmayan adımları UUID'ye çevirip rutini güncelliyoruz, böylece tamamlama kaydedilebilir.
        const hasNonUuid = stepsToSet.some((s) => !isValidUuid(s.id));
        if (hasNonUuid) {
          const migrated = stepsToSet.map((s) => ({
            ...s,
            id: isValidUuid(s.id) ? s.id : generateUuid(),
          }));
          await updateRoutineSteps(routine.id, migrated);
          stepsToSet = migrated;
        }
        setSteps(stepsToSet);
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
              <Flame size={14} color={Colors.dark} />
              <Text style={styles.streakText}>Rutin</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tabs}>
        {ROUTINE_TYPES.map(({ key, label, Icon }) => (
          <Pressable
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => handleTabChange(key)}
          >
            <Icon size={18} color={activeTab === key ? Colors.text : Colors.textSecondary} />
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
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.listCard}>
            {steps.length === 0 ? (
              <View style={styles.empty}>
                <Sparkles size={40} color={Colors.textSecondary} style={{ marginBottom: 12 }} />
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
                            <Check size={14} color={Colors.white} strokeWidth={3} />
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
        <Plus size={28} color={Colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    color: Colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light,
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
    color: Colors.dark,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.lightGray,
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
    backgroundColor: Colors.white,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  progressCard: {
    backgroundColor: Colors.card,
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
    color: Colors.success,
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
    color: Colors.text,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listCard: {
    backgroundColor: Colors.card,
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
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
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
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
  },
  stepBadge: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  stepBody: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    borderColor: Colors.lightGray,
  },
  stepCheckDone: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckIcon: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.white,
    lineHeight: 32,
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
