import { supabase } from './supabase';
import { isValidUuid } from './routine-logs';

export interface ProgressStats {
  /** Consecutive active days ending today (or yesterday if today is not yet done). */
  currentStreak: number;
  /** Longest run of consecutive active days ever recorded. */
  longestStreak: number;
  /** Total number of distinct days with at least one completed step. */
  totalActiveDays: number;
  /** date (YYYY-MM-DD) -> number of completed steps that day (AM + PM combined). */
  byDate: Record<string, number>;
  /** Active days within the current calendar month. */
  thisMonthActiveDays: number;
  /** Days elapsed in the current calendar month (1..31). */
  daysElapsedThisMonth: number;
}

const DAY_MS = 86_400_000;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Builds the set of "active" dates and a per-date completed-step count. */
function buildDayData(
  rows: { date: string; completed_steps: string[] | null }[]
): { activeDates: Set<string>; byDate: Record<string, number> } {
  const byDate: Record<string, number> = {};
  for (const row of rows) {
    const count = (row.completed_steps ?? []).filter(isValidUuid).length;
    if (count <= 0) continue;
    byDate[row.date] = (byDate[row.date] ?? 0) + count;
  }
  return { activeDates: new Set(Object.keys(byDate)), byDate };
}

/** Consecutive days ending today, or yesterday if today has no activity yet. */
function computeCurrentStreak(activeDates: Set<string>): number {
  if (activeDates.size === 0) return 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let cursor = new Date(today);
  if (!activeDates.has(toISODate(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
    if (!activeDates.has(toISODate(cursor))) return 0;
  }

  let streak = 0;
  while (activeDates.has(toISODate(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/** Longest run of consecutive active days across the whole history. */
function computeLongestStreak(activeDates: Set<string>): number {
  if (activeDates.size === 0) return 0;
  const sorted = [...activeDates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00').getTime();
    const curr = new Date(sorted[i] + 'T12:00:00').getTime();
    const dayGap = Math.round((curr - prev) / DAY_MS);
    run = dayGap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return longest;
}

/**
 * Fetches all of a user's routine logs once and derives every progress metric.
 * No schema changes — everything is computed from `routine_logs`.
 */
export async function getProgressStats(userId: string): Promise<ProgressStats> {
  const { data, error } = await supabase
    .from('routine_logs')
    .select('date, completed_steps')
    .eq('user_id', userId);

  if (error) throw error;

  const rows = (data ?? []) as { date: string; completed_steps: string[] | null }[];
  const { activeDates, byDate } = buildDayData(rows);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthActiveDays = [...activeDates].filter((d) => d.startsWith(monthPrefix)).length;

  return {
    currentStreak: computeCurrentStreak(activeDates),
    longestStreak: computeLongestStreak(activeDates),
    totalActiveDays: activeDates.size,
    byDate,
    thisMonthActiveDays,
    daysElapsedThisMonth: now.getDate(),
  };
}

export interface HeatmapDay {
  date: string;
  count: number;
  /** 0 = empty, 1..4 = intensity buckets. */
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
}

/**
 * Builds a Monday-aligned grid of the last `weeks` weeks for a calendar heatmap.
 * Returns an array of weeks, each an array of 7 days (Mon..Sun).
 */
export function buildHeatmapWeeks(byDate: Record<string, number>, weeks = 12): HeatmapDay[][] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Find the most recent Sunday (end of current week) so the grid ends cleanly.
  const dayOfWeek = today.getDay(); // 0 = Sun
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const end = new Date(today.getTime() + daysUntilSunday * DAY_MS);
  const start = new Date(end.getTime() - (weeks * 7 - 1) * DAY_MS);

  const todayISO = toISODate(today);
  const result: HeatmapDay[][] = [];
  let cursor = new Date(start);

  for (let w = 0; w < weeks; w++) {
    const week: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toISODate(cursor);
      const count = byDate[iso] ?? 0;
      week.push({
        date: iso,
        count,
        level: bucket(count),
        isFuture: iso > todayISO,
      });
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
    result.push(week);
  }
  return result;
}

function bucket(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}
