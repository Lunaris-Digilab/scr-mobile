import { supabase } from './supabase';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelReminder,
} from './notifications';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ReminderSetting {
  id: string;
  user_id: string;
  routine_type: 'AM' | 'PM';
  enabled: boolean;
  hour: number;
  minute: number;
}

/* ────────────── CRUD ────────────── */

/** Kullanıcının tüm hatırlatma ayarlarını getirir. */
export async function getReminderSettings(userId: string): Promise<ReminderSetting[]> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as ReminderSetting[];
}

/** Tek bir rutin tipi için hatırlatma ayarını getirir (yoksa null). */
export async function getReminderSetting(
  userId: string,
  routineType: 'AM' | 'PM'
): Promise<ReminderSetting | null> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('routine_type', routineType)
    .maybeSingle();
  if (error) throw error;
  return data as ReminderSetting | null;
}

/** Hatırlatma ayarını oluşturur veya günceller (upsert). */
export async function upsertReminderSetting(
  userId: string,
  routineType: 'AM' | 'PM',
  enabled: boolean,
  hour: number,
  minute: number
): Promise<ReminderSetting> {
  const { data, error } = await supabase
    .from('reminder_settings')
    .upsert(
      {
        user_id: userId,
        routine_type: routineType,
        enabled,
        hour,
        minute,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,routine_type' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as ReminderSetting;
}

/* ────────────── Notification Scheduling ────────────── */

function reminderId(type: 'AM' | 'PM'): string {
  return `routine-reminder-${type}`;
}

/**
 * Bir hatırlatma ayarına göre lokal bildirimi zamanlar veya iptal eder.
 * title ve body parametreleri çeviri desteği için dışarıdan gelir.
 */
export async function syncReminderNotification(
  setting: ReminderSetting,
  title: string,
  body: string
): Promise<void> {
  const id = reminderId(setting.routine_type);
  if (!setting.enabled) {
    await cancelReminder(id);
    return;
  }
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await scheduleDailyReminder(id, setting.hour, setting.minute, title, body);
}

/**
 * Tüm hatırlatma ayarlarını Supabase'den çekip lokal bildirimleri senkronize eder.
 * titleFn / bodyFn: çeviri fonksiyonlarıdır.
 */
export async function syncAllReminders(
  userId: string,
  titleFn: (type: 'AM' | 'PM') => string,
  bodyFn: (type: 'AM' | 'PM') => string
): Promise<void> {
  const settings = await getReminderSettings(userId);
  for (const s of settings) {
    await syncReminderNotification(s, titleFn(s.routine_type), bodyFn(s.routine_type));
  }
  // AM/PM'den biri yoksa bildirimi iptal et
  for (const t of ['AM', 'PM'] as const) {
    if (!settings.find((s) => s.routine_type === t)) {
      await cancelReminder(reminderId(t));
    }
  }
}

/* ────────────── Supabase Realtime ────────────── */

/**
 * reminder_settings tablosundaki değişiklikleri dinler.
 * Değişiklik geldiğinde callback çağrılır.
 */
export function subscribeToReminderChanges(
  userId: string,
  onChange: (setting: ReminderSetting) => void
): RealtimeChannel {
  const channel = supabase
    .channel('reminder-settings-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reminder_settings',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as ReminderSetting | undefined;
        if (row) onChange(row);
      }
    )
    .subscribe();

  return channel;
}

/** Realtime aboneliğini sonlandırır. */
export function unsubscribeFromReminderChanges(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
