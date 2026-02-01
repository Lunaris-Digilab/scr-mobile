import { supabase } from './supabase';
import type { UserProductStatus, UserProductWithProduct } from '../types/user-product';

export async function getUserProducts(
  userId: string,
  status?: UserProductStatus
) {
  let query = supabase
    .from('user_products')
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as UserProductWithProduct[];
}

export async function addToShelf(
  userId: string,
  productId: string,
  status: UserProductStatus,
  options?: { date_opened?: string; expiration_date?: string }
) {
  const { data, error } = await supabase
    .from('user_products')
    .insert({
      user_id: userId,
      product_id: productId,
      status,
      date_opened: options?.date_opened ?? null,
      expiration_date: options?.expiration_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*, products(*)')
    .single();

  if (error) throw error;
  return data as UserProductWithProduct;
}

export async function updateUserProduct(
  id: string,
  updates: Partial<{
    status: UserProductStatus;
    date_opened: string | null;
    expiration_date: string | null;
    rating: number | null;
    review: string | null;
  }>
) {
  const { data, error } = await supabase
    .from('user_products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, products(*)')
    .single();

  if (error) throw error;
  return data as UserProductWithProduct;
}

export async function removeFromShelf(id: string) {
  const { error } = await supabase.from('user_products').delete().eq('id', id);
  if (error) throw error;
}

export async function getExistingUserProduct(
  userId: string,
  productId: string
) {
  const { data, error } = await supabase
    .from('user_products')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
