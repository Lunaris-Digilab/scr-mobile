import { supabase } from './supabase';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Bugünün routine_log kaydını getirir.
 * completed_steps uuid[] olduğu için sadece UUID formatındaki id'ler döner.
 */
export async function getTodayLog(userId: string, routineId: string) {
  return getLogForDate(userId, routineId, todayISO());
}

/**
 * Belirli bir tarihin routine_log kaydını getirir (YYYY-MM-DD).
 */
export async function getLogForDate(
  userId: string,
  routineId: string,
  date: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('routine_logs')
    .select('completed_steps')
    .eq('user_id', userId)
    .eq('routine_id', routineId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  const steps = (data?.completed_steps as string[] | null) ?? [];
  return steps.filter(isValidUuid);
}

/**
 * Bugünün tamamlanan adımlarını routine_logs'a yazar.
 */
export async function upsertTodayLog(
  userId: string,
  routineId: string,
  completedStepIds: string[]
) {
  return upsertLogForDate(userId, routineId, todayISO(), completedStepIds);
}

/**
 * Belirli bir tarihin tamamlanan adımlarını routine_logs'a yazar (YYYY-MM-DD).
 * Var olan günün kaydı güncellenir, yoksa yeni satır eklenir.
 */
export async function upsertLogForDate(
  userId: string,
  routineId: string,
  date: string,
  completedStepIds: string[]
) {
  const uuidsOnly = completedStepIds.filter(isValidUuid);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from('routine_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('routine_id', routineId)
    .eq('date', date)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('routine_logs')
      .update({
        completed_steps: uuidsOnly,
        completed_at: now,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('routine_logs').insert({
      user_id: userId,
      routine_id: routineId,
      date,
      completed_steps: uuidsOnly,
      completed_at: now,
    });
    if (error) throw error;
  }
}

/**
 * Kullanıcının rutin tamamladığı benzersiz gün sayısını döner (profil streak için).
 */
export async function getRoutineLogDaysCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('routine_logs')
    .select('date')
    .eq('user_id', userId);

  if (error) throw error;
  const dates = new Set((data ?? []).map((r) => r.date as string));
  return dates.size;
}
