import { supabase } from './supabase';

export interface UserSkinProfile {
  skin_type: string | null;
  skin_concerns: string[];
}

/**
 * Skin profilini Supabase Auth user_metadata'ya kaydeder.
 * Yeni kayıttan sonra veya rutin oluşturulurken çağrılır (opsiyonel).
 */
export async function saveSkinProfileToAuth(
  options: { skin_type?: string | null; skin_concerns?: string[] }
): Promise<void> {
  const hasProfile = options.skin_type !== undefined || options.skin_concerns !== undefined;
  if (!hasProfile) return;
  const data: Record<string, unknown> = {};
  if (options.skin_type !== undefined) data.skin_type = options.skin_type;
  if (options.skin_concerns !== undefined)
    data.skin_concerns = Array.isArray(options.skin_concerns) ? options.skin_concerns : [];
  await supabase.auth.updateUser({ data });
}

/** Mevcut kullanıcının skin_type ve skin_concerns bilgisini Auth user_metadata'dan okur. */
export async function getCurrentUserSkinProfile(userId: string): Promise<UserSkinProfile | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== userId) return null;
  const meta = user.user_metadata ?? {};
  return {
    skin_type: meta.skin_type ?? null,
    skin_concerns: Array.isArray(meta.skin_concerns) ? meta.skin_concerns : [],
  };
}

/** Mevcut kullanıcının skin_type ve skin_concerns alanlarını Auth user_metadata'da günceller. */
export async function updateUserSkinProfile(
  _userId: string,
  options: { skin_type?: string | null; skin_concerns?: string[] }
): Promise<{ error: Error | null }> {
  const data: Record<string, unknown> = {};
  if (options.skin_type !== undefined) data.skin_type = options.skin_type;
  if (options.skin_concerns !== undefined)
    data.skin_concerns = Array.isArray(options.skin_concerns) ? options.skin_concerns : [];
  const { error } = await supabase.auth.updateUser({ data });
  return { error: error ?? null };
}
