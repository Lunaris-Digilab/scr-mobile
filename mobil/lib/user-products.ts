import { supabase } from './supabase';
import type { UserProductStatus, UserProductWithProduct } from '../types/user-product';
import type { Product } from '../types/product';

const EMBED_SELECT = '*, products(*, companies(name))';

/** Fallback: fetch products separately and merge (when embed fails e.g. PGRST200) */
async function enrichWithProducts(
  rows: Record<string, unknown>[]
): Promise<UserProductWithProduct[]> {
  if (rows.length === 0) return [];
  const productIds = [...new Set(rows.map((r) => r.product_id as string).filter(Boolean))];
  const { data: products } = await supabase
    .from('products')
    .select('*, companies(name)')
    .in('id', productIds);
  const map = new Map<string | null, Product | null>((products ?? []).map((p) => [p.id, p as Product]));
  return rows.map((r) => ({
    ...r,
    products: map.get(r.product_id as string) ?? null,
  })) as UserProductWithProduct[];
}

export async function getUserProducts(
  userId: string,
  status?: UserProductStatus
) {
  let query = supabase
    .from('user_products')
    .select(EMBED_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (!error) return (data ?? []) as UserProductWithProduct[];

  // PGRST200: no FK relationship in schema cache - use fallback
  if (error.code === 'PGRST200') {
    let fallbackQuery = supabase
      .from('user_products')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (status) fallbackQuery = fallbackQuery.eq('status', status);
    const { data: rows, error: err } = await fallbackQuery;
    if (err) throw err;
    return enrichWithProducts(rows ?? []);
  }
  throw error;
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
    .select('*')
    .single();

  if (error) throw error;
  const [enriched] = await enrichWithProducts(data ? [data] : []);
  return enriched;
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
    .select('*')
    .single();

  if (error) throw error;
  const [enriched] = await enrichWithProducts(data ? [data] : []);
  return enriched;
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
