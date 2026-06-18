import { supabase } from './supabase';

export type UserRole = 'user' | 'admin';

/**
 * Reads the current user's role from public.profiles. Returns null if there is
 * no session. Defaults to 'user' if the row is missing or unreadable, so a
 * failure never accidentally grants admin.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return 'user';
  return data?.role === 'admin' ? 'admin' : 'user';
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await getCurrentUserRole()) === 'admin';
}
