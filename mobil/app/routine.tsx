import { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { getLogForDate, upsertLogForDate, isValidUuid, getStreak } from '../lib/routine-logs';
import { getProductsByIds } from '../lib/products';
import type { RoutineStep, RoutineType } from '../types/routine';
import { Colors, Shadows } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { useLanguage } from '../context/LanguageContext';
import { haptic } from '../lib/haptics';
import { CircularProgress } from '../components/CircularProgress';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { RoutineSkeleton } from '../components/Skeleton';
import { BottomSheet } from '../components/BottomSheet';

import {
  Sun,
  Moon,
  Sparkles,
  Check,
  Plus,
  Flame,
  Bell,
  ChevronUp,
  ChevronDown,
  Trash2,
  Undo2,
} from 'lucide-react-native';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekDays(
  centerDate: string,
  dayLabels: string[]
): { date: string; dayNum: number; label: string }[] {
  const d = new Date(centerDate + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const toMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - toMonday);
  const result: { date: string; dayNum: number; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = d.toISOString().slice(0, 10);
    result.push({
      date: iso,
      dayNum: parseInt(iso.slice(8, 10), 10),
      label: dayLabels[i] ?? '',
    });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

/* ---------- Animated Streak Flame ---------- */
function StreakFlame({ streak }: { streak: number }) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (streak > 0) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000 }),
          withTiming(0.2, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [streak]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={streakStyles.wrap}>
      {streak > 0 && (
        <Animated.View style={[streakStyles.glow, glowStyle]} />
      )}
      <Animated.View style={flameStyle}>
        <Flame size={16} color="#C78B4D" fill="#C78B4D" />
      </Animated.View>
      <Text style={streakStyles.text}>{streak}</Text>
    </View>
  );
}

const streakStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: '#C78B4D',
  },
  text: {
    fontSize: 14,
    fontFamily: Typography.bold,
    color: Colors.text,
  },
});

/* ---------- Swipeable Step Card ---------- */
function SwipeableStepCard({
  step,
  index,
  totalSteps,
  isCompleted,
  imageUrl,
  onToggleComplete,
  onDelete,
  onMoveUp,
  onMoveDown,
  t,
}: {
  step: RoutineStep;
  index: number;
  totalSteps: number;
  isCompleted: boolean;
  imageUrl?: string;
  onToggleComplete: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  t: (key: string) => string;
}) {
  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 80;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD && !isCompleted) {
        runOnJS(onToggleComplete)();
        runOnJS(haptic.success)();
        translateX.value = withSpring(0, { damping: 20 });
      } else if (e.translationX < -SWIPE_THRESHOLD && isCompleted) {
        runOnJS(onToggleComplete)();
        runOnJS(haptic.light)();
        translateX.value = withSpring(0, { damping: 20 });
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rightBgStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translateX.value / SWIPE_THRESHOLD)),
  }));

  const leftBgStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translateX.value / SWIPE_THRESHOLD)),
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(400).springify()}
      layout={Layout.springify()}
      style={styles.stepCardOuter}
    >
      {/* Swipe backgrounds */}
      <Animated.View style={[styles.swipeBgRight, rightBgStyle]}>
        <Check size={22} color={Colors.white} strokeWidth={3} />
      </Animated.View>
      <Animated.View style={[styles.swipeBgLeft, leftBgStyle]}>
        <Undo2 size={22} color={Colors.white} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.stepCard, cardStyle]}>
          <View style={styles.stepCardInner}>
            <View style={styles.stepReorderCol}>
              <Pressable
                style={[styles.stepReorderBtn, index === 0 && styles.stepReorderBtnDisabled]}
                onPress={() => { haptic.selection(); onMoveUp(); }}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel={t('a11yMoveStepUp')}
                hitSlop={6}
              >
                <ChevronUp
                  size={18}
                  color={index === 0 ? Colors.lightGray : Colors.textSecondary}
                />
              </Pressable>
              <Pressable
                style={[styles.stepReorderBtn, index >= totalSteps - 1 && styles.stepReorderBtnDisabled]}
                onPress={() => { haptic.selection(); onMoveDown(); }}
                disabled={index >= totalSteps - 1}
                accessibilityRole="button"
                accessibilityLabel={t('a11yMoveStepDown')}
                hitSlop={6}
              >
                <ChevronDown
                  size={18}
                  color={index >= totalSteps - 1 ? Colors.lightGray : Colors.textSecondary}
                />
              </Pressable>
            </View>

            <View style={styles.stepImageWrap}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
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
              <Text
                style={[styles.stepName, isCompleted && styles.stepNameCompleted]}
              >
                {step.name}
              </Text>
              <Text style={styles.stepDesc} numberOfLines={1}>
                {step.description || t('product')} • {t('step')} {index + 1}
              </Text>
            </View>

            <Pressable
              style={styles.stepCheckWrap}
              onPress={() => { haptic.selection(); onToggleComplete(); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {isCompleted ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={styles.stepCheckDone}
                >
                  <Check size={14} color={Colors.white} strokeWidth={3} />
                </Animated.View>
              ) : (
                <View style={styles.stepCheckEmpty} />
              )}
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

/* ---------- Main Screen ---------- */
export default function RoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottomOffset = insets.bottom + (Platform.OS === 'ios' ? 96 : 82);
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(() => todayISO());

  const ROUTINE_TYPES: { key: RoutineType; label: string; Icon: typeof Sun }[] = [
    { key: 'AM', label: t('routineMorning'), Icon: Sun },
    { key: 'PM', label: t('routineEvening'), Icon: Moon },
  ];
  const DAY_LABELS = [
    t('dayMon'), t('dayTue'), t('dayWed'), t('dayThu'),
    t('dayFri'), t('daySat'), t('daySun'),
  ];

  const [activeTab, setActiveTab] = useState<RoutineType>('AM');
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [stepImageUrls, setStepImageUrls] = useState<Record<string, string>>({});
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const prevCompletedRef = useRef(0);

  // Tab pill animation
  const tabPillLeft = useSharedValue(0);
  const tabContainerWidth = useSharedValue(0);
  const tabPillStyle = useAnimatedStyle(() => ({
    left: tabPillLeft.value,
  }));

  useEffect(() => {
    const padding = 4;
    const target = activeTab === 'AM' ? padding : tabContainerWidth.value / 2;
    tabPillLeft.value = withSpring(target, {
      damping: 18,
      stiffness: 120,
    });
  }, [activeTab]);

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
        const hasNonUuid = stepsToSet.some(
          (s: RoutineStep) => !isValidUuid(s.id)
        );
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
        const productIds = [
          ...new Set(
            (stepsToSet as RoutineStep[])
              .map((s) => s.product_id)
              .filter(Boolean) as string[]
          ),
        ];
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
      getStreak(user.id).then(setStreak).catch(() => setStreak(0));
    });
  }, [activeTab, loadRoutine, router]);

  useFocusEffect(
    useCallback(() => {
      if (userId && routineId) {
        loadRoutine(userId, activeTab);
      }
    }, [userId, routineId, activeTab, loadRoutine])
  );

  // Celebration trigger
  const stepIds = new Set(steps.map((s) => s.id));
  const validCompletedIds = completedStepIds.filter((id) => stepIds.has(id));
  const completedCount = validCompletedIds.length;
  const totalSteps = steps.length;
  const progressFraction = totalSteps > 0 ? completedCount / totalSteps : 0;

  useEffect(() => {
    if (
      completedCount === totalSteps &&
      totalSteps > 0 &&
      prevCompletedRef.current < totalSteps
    ) {
      setShowCelebration(true);
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, totalSteps]);

  const handleSelectDay = useCallback(
    (date: string) => {
      haptic.selection();
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
    haptic.light();
    setLoading(true);
    setActiveTab(type);
    if (userId) loadRoutine(userId, type);
  };

  const handleDeleteStep = async () => {
    if (!routineId || !userId || !deleteTarget) return;
    try {
      await removeStepFromRoutine(routineId, deleteTarget);
      setSteps((prev) => prev.filter((s) => s.id !== deleteTarget));
      const nextCompleted = completedStepIds.filter((id) => id !== deleteTarget);
      await saveCompletedSteps(userId, routineId, nextCompleted);
    } catch (e) {
      console.error(e);
    }
    setDeleteTarget(null);
  };

  const handleToggleComplete = (stepId: string) => {
    if (!routineId || !userId) return;
    const next = completedStepIds.includes(stepId)
      ? completedStepIds.filter((id) => id !== stepId)
      : [...completedStepIds, stepId];
    saveCompletedSteps(userId, routineId, next).then(() => {
      getStreak(userId).then(setStreak).catch(() => {});
    });
  };

  const weekDays = getWeekDays(selectedDate, DAY_LABELS);
  const isToday = selectedDate === todayISO();

  if (!userId && !loading) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Celebration Overlay */}
      <CelebrationOverlay
        trigger={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Calendar Card */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.calendarCard}>
        <View style={styles.calendarTopRow}>
          <StreakFlame streak={streak} />
          <Text style={styles.calendarTodayLabel}>
            {isToday ? t('today') : selectedDate}
          </Text>
          <Pressable
            style={styles.calendarIconBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('a11yReminders')}
            onPress={() => {
              haptic.light();
              router.push('/reminder-settings');
            }}
          >
            <Bell size={20} color={Colors.white} />
          </Pressable>
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
                accessibilityRole="button"
                accessibilityLabel={day.date}
                accessibilityState={{ selected }}
              >
                <View
                  style={[styles.dateCircle, selected && styles.dateCircleSelected]}
                >
                  <Text
                    style={[styles.dateNum, selected && styles.dateNumSelected]}
                  >
                    {day.dayNum}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* AM/PM Tabs with animated pill */}
      <View
        style={styles.tabs}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          tabContainerWidth.value = w;
          // Set initial position without animation
          const padding = 4;
          tabPillLeft.value = activeTab === 'AM' ? padding : w / 2;
        }}
      >
        <Animated.View style={[styles.tabPill, tabPillStyle]} />
        {ROUTINE_TYPES.map(({ key, label, Icon }) => (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => handleTabChange(key)}
          >
            <Icon
              size={18}
              color={activeTab === key ? Colors.text : Colors.textSecondary}
            />
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

      {/* Content */}
      {loading ? (
        <View style={{ paddingTop: 8 }}>
          <RoutineSkeleton />
        </View>
      ) : steps.length === 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 170 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={36} color={Colors.medium} />
            </View>
            <Text style={styles.emptyTitle}>{t('routineEmpty')}</Text>
            <Pressable
              style={styles.emptyAddBtn}
              onPress={() => {
                if (!routineId) return;
                haptic.light();
                router.push({
                  pathname: '/products/add',
                  params: { routineId, routineType: activeTab },
                });
              }}
            >
              <Plus size={18} color={Colors.white} />
              <Text style={styles.emptyAddBtnText}>{t('shelfAddProduct')}</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      ) : (
        <FlatList
          data={[...steps].sort((a, b) => a.order - b.order)}
          keyExtractor={(item) => item.id}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 170 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            totalSteps > 0 ? (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.progressCard}>
                <View style={styles.progressRow}>
                  <CircularProgress
                    progress={progressFraction}
                    size={72}
                    strokeWidth={6}
                    color={completedCount === totalSteps ? Colors.success : Colors.primary}
                  />
                  <View style={styles.progressInfo}>
                    <Text style={styles.progressLabel}>{t('progress')}</Text>
                    <Text style={styles.progressText}>
                      {completedCount} / {totalSteps} {t('stepsCompleted')}
                    </Text>
                    {completedCount === totalSteps && (
                      <Animated.Text
                        entering={FadeIn.duration(300)}
                        style={styles.progressCompleteText}
                      >
                        {'\u2728'} {t('routineComplete')}
                      </Animated.Text>
                    )}
                  </View>
                </View>
              </Animated.View>
            ) : null
          }
          renderItem={({ item: step, index }) => {
            const isCompleted = completedStepIds.includes(step.id);
            return (
              <SwipeableStepCard
                step={step}
                index={index}
                totalSteps={steps.length}
                isCompleted={isCompleted}
                imageUrl={
                  step.product_id ? stepImageUrls[step.product_id] : undefined
                }
                onToggleComplete={() => handleToggleComplete(step.id)}
                onDelete={() => setDeleteTarget(step.id)}
                onMoveUp={() => handleMoveStep(index, 'up')}
                onMoveDown={() => handleMoveStep(index, 'down')}
                t={t as (key: string) => string}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(500)}
        style={[styles.fab, { bottom: fabBottomOffset }, !routineId && styles.fabDisabled]}
      >
        <Pressable
          style={styles.fabInner}
          accessibilityRole="button"
          accessibilityLabel={t('shelfAddProduct')}
          onPress={() => {
            if (!routineId) return;
            haptic.medium();
            router.push({
              pathname: '/products/add',
              params: { routineId, routineType: activeTab },
            });
          }}
          disabled={!routineId}
        >
          <Plus size={28} color={Colors.white} />
        </Pressable>
      </Animated.View>

      {/* Delete Bottom Sheet */}
      <BottomSheet
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('deleteStepTitle')}
        message={t('deleteStepMessage')}
        actions={[
          {
            label: t('delete'),
            variant: 'destructive',
            icon: <Trash2 size={18} color={Colors.error} />,
            onPress: handleDeleteStep,
          },
          {
            label: t('cancel'),
            variant: 'default',
            onPress: () => setDeleteTarget(null),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Calendar */
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.medium,
    ...Shadows.card,
  },
  calendarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarTodayLabel: {
    fontSize: 18,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  calendarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: Typography.semibold,
    color: 'rgba(255,255,255,0.7)',
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleSelected: {
    backgroundColor: Colors.white,
  },
  dateNum: {
    fontSize: 16,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  dateNumSelected: {
    color: Colors.medium,
  },

  /* Tabs */
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.lightGray,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    position: 'relative',
  },
  tabPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    ...Shadows.glass,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    color: Colors.text,
    fontFamily: Typography.semibold,
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* Progress Card */
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Shadows.card,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.text,
  },
  progressCompleteText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.success,
    marginTop: 4,
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    ...Shadows.card,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.white,
  },

  /* Step Card */
  stepCardOuter: {
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  swipeBgRight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.success,
    borderRadius: 14,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 24,
  },
  swipeBgLeft: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.textSecondary,
    borderRadius: 14,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 24,
  },
  stepCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    ...Shadows.card,
  },
  stepCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  stepImageWrap: {
    width: 52,
    height: 52,
    marginRight: 14,
    position: 'relative',
  },
  stepImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  stepImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray,
    borderRadius: 16,
  },
  stepBadge: {
    position: 'absolute',
    bottom: -3,
    left: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  stepBadgeText: {
    fontSize: 10,
    fontFamily: Typography.bold,
    color: Colors.white,
  },
  stepBody: {
    flex: 1,
    minWidth: 0,
  },
  stepName: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  stepNameCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
  stepCheckWrap: {
    marginLeft: 12,
    padding: 4,
  },
  stepCheckEmpty: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.lightGray,
  },
  stepCheckDone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...Shadows.fab,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabDisabled: {
    opacity: 0.5,
  },
});
