import { supabase } from './supabase';

/**
 * routines.user_id → public.users(id) olduğu için,
 * rutin oluşturmadan önce kullanıcının public.users'da kaydı olmalı.
 * RLS izin vermiyorsa bu çağrı sessizce atlanır; kullanıcı kaydı
 * trigger veya backend ile oluşturuluyorsa sorun olmaz.
 */
export async function ensurePublicUser(userId: string, email: string) {
  try {
    const { error } = await supabase.from('users').upsert(
      { id: userId, email, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (error && !error.message?.includes('row-level security')) {
      console.warn('ensurePublicUser:', error.message);
    }
  } catch {
    // RLS vb. nedeniyle atla; trigger/backend ile user zaten oluşturuluyorsa sorun yok
  }
}
