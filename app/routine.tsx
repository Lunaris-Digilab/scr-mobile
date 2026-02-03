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
  Image,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import {
  getOrCreateRoutine,
  removeStepFromRoutine,
  updateRoutineSteps,
  reorderRoutineSteps,
  generateUuid,
} from '../lib/routines';
import { getLogForDate, upsertLogForDate, isValidUuid } from '../lib/routine-logs';
import { getProductsByIds } from '../lib/products';
import type { RoutineStep, RoutineType } from '../types/routine';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';

import { Sun, Moon, Sparkles, Check, Plus, Zap, BarChart3, Bell, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react-native';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seçilen tarihin bulunduğu haftanın Pazartesi'sinden itibaren 7 gün döner. */
function getWeekDays(centerDate: string, dayLabels: string[]): { date: string; dayNum: number; label: string }[] {
  const d = new Date(centerDate + 'T12:00:00');
  const dayOfWeek = d.getDay(); // 0 Pazar, 1 Pazartesi, ...
  const toMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - toMonday);
  const result: { date: string; dayNum: number; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, dayNum: parseInt(iso.slice(8, 10), 10), label: dayLabels[i] ?? '' });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

export default function RoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());

  const ROUTINE_TYPES: { key: RoutineType; label: string; Icon: typeof Sun }[] = [
    { key: 'AM', label: t('routineMorning'), Icon: Sun },
    { key: 'PM', label: t('routineEvening'), Icon: Moon },
  ];
  const DAY_LABELS = [t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'), t('dayFri'), t('daySat'), t('daySun')];
  const [activeTab, setActiveTab] = useState<RoutineType>('AM');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [stepImageUrls, setStepImageUrls] = useState<Record<string, string>>({});
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadCompletedStepsForDate = useCallback(
    async (uid: string, rid: string, date: string) => {
      try {
        const ids = await getLogForDate(uid, rid, date);
        setCompletedStepIds(ids);
      } catch {
        setCompletedStepIds([]);
      }
    },
    []
  );

  const saveCompletedSteps = useCallback(
    async (uid: string, rid: string, ids: string[]) => {
      setCompletedStepIds(ids);
      try {
        await upsertLogForDate(uid, rid, selectedDate, ids);
      } catch (e) {
        console.error(e);
        Alert.alert(t('error'), t('saveCompletionFailed'));
      }
    },
    [selectedDate]
  );

  const loadRoutine = useCallback(
    async (uid: string, type: RoutineType, email?: string) => {
      try {
        const routine = await getOrCreateRoutine(uid, type, email);
        setRoutineId(routine.id);
        let stepsToSet = routine.steps ?? [];
        // Eski "step-xxx" id'leri UUID değil; routine_logs.completed_steps uuid[] kabul ediyor.
        // UUID olmayan adımları UUID'ye çevirip rutini güncelliyoruz, böylece tamamlama kaydedilebilir.
        const hasNonUuid = stepsToSet.some((s: RoutineStep) => !isValidUuid(s.id));
        if (hasNonUuid) {
          const migrated = stepsToSet.map((s: RoutineStep) => ({
            ...s,
            id: isValidUuid(s.id) ? s.id : generateUuid(),
          }));
          await updateRoutineSteps(routine.id, migrated);
          stepsToSet = migrated;
        }
        setSteps(stepsToSet);
        await loadCompletedStepsForDate(uid, routine.id, selectedDate);
        const productIds = [...new Set((stepsToSet as RoutineStep[]).map((s) => s.product_id).filter(Boolean) as string[])];
        if (productIds.length > 0) {
          try {
            const products = await getProductsByIds(productIds);
            const map: Record<string, string> = {};
            products.forEach((p) => {
              if (p.image_url) map[p.id] = p.image_url;
            });
            setStepImageUrls(map);
          } catch {
            setStepImageUrls({});
          }
        } else {
          setStepImageUrls({});
        }
      } catch (e) {
        console.error(e);
        Alert.alert(t('error'), t('loadRoutineFailed'));
      } finally {
        setLoading(false);
      }
    },
    [loadCompletedStepsForDate, selectedDate]
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

  const handleSelectDay = useCallback(
    (date: string) => {
      setSelectedDate(date);
      if (userId && routineId) {
        loadCompletedStepsForDate(userId, routineId, date);
      }
    },
    [userId, routineId, loadCompletedStepsForDate]
  );

  const handleReorder = useCallback(
    async (newData: RoutineStep[]) => {
      if (!routineId || !userId) return;
      const reordered = newData.map((s, i) => ({ ...s, order: i }));
      setSteps(reordered);
      try {
        await reorderRoutineSteps(routineId, reordered.map((s) => s.id));
      } catch (e) {
        console.error(e);
        Alert.alert(t('error'), t('saveOrderFailed'));
      }
    },
    [routineId, userId]
  );

  const handleMoveStep = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const sorted = [...steps].sort((a, b) => a.order - b.order);
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sorted.length) return;
      const next = [...sorted];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      handleReorder(next);
    },
    [steps, handleReorder]
  );

  const handleTabChange = (type: RoutineType) => {
    if (type === activeTab) return;
    setLoading(true);
    setActiveTab(type);
    if (userId) loadRoutine(userId, type); // email optional on refetch
  };

  const handleDeleteStep = (stepId: string) => {
    if (!routineId) return;
    Alert.alert(t('deleteStepTitle'), t('deleteStepMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          if (!userId) return;
          try {
            await removeStepFromRoutine(routineId, stepId);
            setSteps((prev) => prev.filter((s) => s.id !== stepId));
            const nextCompleted = completedStepIds.filter((id) => id !== stepId);
            await saveCompletedSteps(userId, routineId, nextCompleted);
          } catch (e) {
            Alert.alert(t('error'), t('deleteFailed'));
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

  const stepIds = new Set(steps.map((s) => s.id));
  const validCompletedIds = completedStepIds.filter((id) => stepIds.has(id));
  const completedCount = validCompletedIds.length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const weekDays = getWeekDays(selectedDate, DAY_LABELS);
  const isToday = selectedDate === todayISO();

  if (!userId && !loading) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.calendarCard}>
        <View style={styles.calendarTopRow}>
          <View style={styles.calendarBadge}>
            <Zap size={14} color={Colors.text} />
            <Text style={styles.calendarBadgeText}>1</Text>
            <BarChart3 size={14} color={Colors.text} />
            <Text style={styles.calendarBadgeText}>0</Text>
          </View>
          <Text style={styles.calendarTodayLabel}>{isToday ? t('today') : selectedDate}</Text>
          <View style={styles.calendarIcons}>
            <Pressable style={styles.calendarIconBtn} hitSlop={8}>
              <Bell size={20} color={Colors.white} />
            </Pressable>
          
          </View>
        </View>
        <View style={styles.weekRow}>
          {weekDays.map((day) => (
            <View key={day.date} style={styles.weekDayCell}>
              <Text style={styles.weekDayLabel}>{day.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.datesRow}>
          {weekDays.map((day) => {
            const selected = day.date === selectedDate;
            return (
              <Pressable
                key={day.date}
                style={styles.dateCell}
                onPress={() => handleSelectDay(day.date)}
              >
                <View style={[styles.dateCircle, selected && styles.dateCircleSelected]}>
                  <Text style={[styles.dateNum, selected && styles.dateNumSelected]}>
                    {day.dayNum}
                  </Text>
                </View>
              </Pressable>
            );
          })}
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

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : steps.length === 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {totalSteps > 0 && (
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>{t('progress')}</Text>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>
                  {completedCount} / {totalSteps} {t('stepsCompleted')}
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
          <View style={styles.emptyCard}>
            <Sparkles size={40} color={Colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>
              {t('routineEmpty')}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={[...steps].sort((a, b) => a.order - b.order)}
          keyExtractor={(item) => item.id}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            totalSteps > 0 ? (
              <View style={styles.progressCard}>
                <Text style={styles.progressLabel}>{t('progress')}</Text>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>
                    {completedCount} / {totalSteps} {t('stepsCompleted')}
                  </Text>
                  <Text style={styles.progressPercent}>{progressPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                  />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item: step, index }) => {
            const isCompleted = completedStepIds.includes(step.id);
            const sortedLength = steps.length;
            return (
              <Pressable
                style={styles.stepCard}
                onLongPress={() => handleDeleteStep(step.id)}
              >
                <View style={styles.stepCardInner}>
                  <View style={styles.stepReorderCol}>
                    <Pressable
                      style={[styles.stepReorderBtn, index === 0 && styles.stepReorderBtnDisabled]}
                      onPress={() => handleMoveStep(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp size={18} color={index === 0 ? Colors.lightGray : Colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      style={[styles.stepReorderBtn, index >= sortedLength - 1 && styles.stepReorderBtnDisabled]}
                      onPress={() => handleMoveStep(index, 'down')}
                      disabled={index >= sortedLength - 1}
                    >
                      <ChevronDown size={18} color={index >= sortedLength - 1 ? Colors.lightGray : Colors.textSecondary} />
                    </Pressable>
                  </View>
                  <View style={styles.stepImageWrap}>
                    {step.product_id && stepImageUrls[step.product_id] ? (
                      <Image
                        source={{ uri: stepImageUrls[step.product_id] }}
                        style={styles.stepImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.stepImagePlaceholder} />
                    )}
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{index + 1}</Text>
                    </View>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepName}>{step.name}</Text>
                    <Text style={styles.stepDesc} numberOfLines={1}>
                      {step.description || t('product')} • {t('step')} {index + 1}
                    </Text>
                  </View>
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
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        style={[
          styles.fab,
          { bottom: insets.bottom + 24 },
          !routineId && styles.fabDisabled,
        ]}
        onPress={() => {
          if (!routineId) return;
          router.push({
            pathname: '/products/add',
            params: { routineId, routineType: activeTab },
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
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.medium,
    overflow: 'hidden',
  },
  calendarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  calendarBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  calendarTodayLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  calendarIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarIconBtn: {
    padding: 4,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dateCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleSelected: {
    backgroundColor: Colors.white,
  },
  dateNum: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  dateNumSelected: {
    color: Colors.medium,
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
    backgroundColor: Colors.light,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.text,
    fontWeight: '600',
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
    color: Colors.textSecondary,
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
    fontWeight: '600',
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
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  stepCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  stepReorderCol: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepReorderBtn: {
    padding: 4,
  },
  stepReorderBtnDisabled: {
    opacity: 0.4,
  },
  stepCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  stepImageWrap: {
    width: 56,
    height: 56,
    marginRight: 14,
    position: 'relative',
  },
  stepImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  stepImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray,
    borderRadius: 28,
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
    minWidth: 0,
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
  },
  stepCheckDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
