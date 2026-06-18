import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flame, TrendingUp, CalendarCheck, Sparkles } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import {
  getProgressStats,
  buildHeatmapWeeks,
  type ProgressStats,
  type HeatmapDay,
} from '../lib/progress';
import { Colors, Shadows } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { useLanguage } from '../context/LanguageContext';
import { getMonthsShort, type TranslationKey } from '../constants/translations';
import { CircularProgress } from '../components/CircularProgress';
import { ProfileSkeleton } from '../components/Skeleton';

const HEATMAP_RAMP = [
  Colors.lightGray, // 0 — no activity
  Colors.mediumLight, // 1
  Colors.medium, // 2
  Colors.gold, // 3
  Colors.goldDeep, // 4
] as const;

const WEEKDAY_KEYS: TranslationKey[] = ['dayMon', 'dayWed', 'dayFri'];

function StatTile({
  Icon,
  value,
  label,
  tint,
}: {
  Icon: typeof Flame;
  value: number;
  label: string;
  tint: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIconWrap, { backgroundColor: tint + '22' }]}>
        <Icon size={18} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      getProgressStats(user.id)
        .then((s) => { if (!cancelled) setStats(s); })
        .catch(() => { if (!cancelled) setStats(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: 24 }}>
          <ProfileSkeleton />
        </View>
      </View>
    );
  }

  const hasData = !!stats && stats.totalActiveDays > 0;
  const weeks = stats ? buildHeatmapWeeks(stats.byDate, 12) : [];
  const monthProgress =
    stats && stats.daysElapsedThisMonth > 0
      ? Math.min(1, stats.thisMonthActiveDays / stats.daysElapsedThisMonth)
      : 0;

  // Start/end month captions for the heatmap range (robust against column widths).
  const months = getMonthsShort(locale ?? 'tr');
  const firstDay = weeks[0]?.[0]?.date;
  const lastWeek = weeks[weeks.length - 1];
  const lastDay = lastWeek?.[lastWeek.length - 1]?.date;
  const rangeStart = firstDay ? months[parseInt(firstDay.slice(5, 7), 10) - 1] : '';
  const rangeEnd = lastDay ? months[parseInt(lastDay.slice(5, 7), 10) - 1] : '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Stat tiles */}
      <Animated.View entering={FadeInDown.duration(450)} style={styles.statsRow}>
        <StatTile Icon={Flame} value={stats?.currentStreak ?? 0} label={t('currentStreak')} tint={Colors.gold} />
        <StatTile Icon={TrendingUp} value={stats?.longestStreak ?? 0} label={t('longestStreak')} tint={Colors.primary} />
        <StatTile Icon={CalendarCheck} value={stats?.totalActiveDays ?? 0} label={t('totalActiveDays')} tint={Colors.success} />
      </Animated.View>

      {!hasData ? (
        <Animated.View entering={FadeIn.delay(150).duration(500)} style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Sparkles size={34} color={Colors.medium} />
          </View>
          <Text style={styles.emptyText}>{t('progressEmpty')}</Text>
        </Animated.View>
      ) : (
        <>
          {/* Activity heatmap */}
          <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t('progressActivity')}</Text>
              <Text style={styles.cardSubtitle}>{t('progressLast12Weeks')}</Text>
            </View>

            <View style={styles.heatmapRow}>
              {/* Weekday labels (Mon / Wed / Fri) */}
              <View style={styles.weekdayCol}>
                {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                  <View key={d} style={styles.heatCellSlot}>
                    {d % 2 === 0 && d / 2 < WEEKDAY_KEYS.length ? (
                      <Text style={styles.weekdayLabel}>{t(WEEKDAY_KEYS[d / 2])}</Text>
                    ) : null}
                  </View>
                ))}
              </View>

              {/* Week columns */}
              <View style={styles.heatGrid}>
                {weeks.map((week, wi) => (
                  <View key={wi} style={styles.heatColumn}>
                    {week.map((day) => (
                      <HeatCell key={day.date} day={day} />
                    ))}
                  </View>
                ))}
              </View>
            </View>

            {/* Month range caption */}
            <View style={styles.rangeRow}>
              <Text style={styles.monthLabel}>{rangeStart}</Text>
              <Text style={styles.monthLabel}>{rangeEnd}</Text>
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <Text style={styles.legendText}>{t('progressLess')}</Text>
              {HEATMAP_RAMP.map((c, i) => (
                <View key={i} style={[styles.legendSwatch, { backgroundColor: c }]} />
              ))}
              <Text style={styles.legendText}>{t('progressMore')}</Text>
            </View>
          </Animated.View>

          {/* This month consistency */}
          <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t('progressThisMonth')}</Text>
              <Text style={styles.cardSubtitle}>{t('progressConsistency')}</Text>
            </View>
            <View style={styles.monthRow}>
              <CircularProgress progress={monthProgress} size={84} strokeWidth={8} color={Colors.gold} />
              <View style={styles.monthInfo}>
                <Text style={styles.monthBig}>
                  {stats?.thisMonthActiveDays ?? 0}
                  <Text style={styles.monthSmall}> / {stats?.daysElapsedThisMonth ?? 0}</Text>
                </Text>
                <Text style={styles.monthLabelText}>{t('progressDaysActive')}</Text>
              </View>
            </View>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

function HeatCell({ day }: { day: HeatmapDay }) {
  if (day.isFuture) {
    return <View style={[styles.heatCell, styles.heatCellFuture]} />;
  }
  return <View style={[styles.heatCell, { backgroundColor: HEATMAP_RAMP[day.level] }]} />;
}

const CELL = 14;
const CELL_GAP = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  /* Stat tiles */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Shadows.card,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: Typography.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  /* Card */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Typography.bold,
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },

  /* Heatmap */
  heatmapRow: {
    flexDirection: 'row',
  },
  weekdayCol: {
    width: 28,
    marginRight: 4,
  },
  heatCellSlot: {
    height: CELL,
    marginBottom: CELL_GAP,
    justifyContent: 'center',
  },
  weekdayLabel: {
    fontSize: 9,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  heatGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heatColumn: {
    width: CELL,
    alignItems: 'center',
  },
  heatCell: {
    width: CELL,
    height: CELL,
    borderRadius: 4,
    marginBottom: CELL_GAP,
  },
  heatCellFuture: {
    backgroundColor: 'transparent',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 32,
  },
  monthLabel: {
    fontSize: 10,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },

  /* Legend */
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 14,
  },
  legendText: {
    fontSize: 10,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    marginHorizontal: 2,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },

  /* Month consistency */
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  monthInfo: {
    flex: 1,
  },
  monthBig: {
    fontSize: 30,
    fontFamily: Typography.bold,
    color: Colors.text,
  },
  monthSmall: {
    fontSize: 18,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
  },
  monthLabelText: {
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  /* Empty */
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
  emptyText: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
