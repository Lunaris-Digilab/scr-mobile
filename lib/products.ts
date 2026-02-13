import { supabase } from './supabase';
import { getOrCreateCompany } from './companies';
import type { Product, ProductCategory } from '../types/product';

export async function getProducts(options?: {
  search?: string;
  category?: ProductCategory;
  brand?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('products')
    .select('*, companies(name)')
    .order('name', { ascending: true });

  if (options?.search?.trim()) {
    const raw = options.search.trim();
    const term = raw.replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.brand?.trim()) {
    query = query.ilike('brand', `%${options.brand.trim()}%`);
  }
  const limit = options?.limit ?? 50;
  if (options?.offset != null) {
    query = query.range(options.offset, options.offset + limit - 1);
  } else if (options?.limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, companies(name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Product;
}

/** Birden fazla ürünü id ile getirir (rutin adımlarındaki görseller için). */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('id, image_url')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function createProduct(input: {
  name: string;
  brand?: string;
  category?: ProductCategory;
  category_id?: string | null;
  company_id?: string | null;
  company_name?: string;
  ingredients_text?: string;
  barcode?: string;
  image_url?: string;
  is_private?: boolean;
  rating?: number | null;
}) {
  let companyId = input.company_id ?? null;
  if (!companyId && input.company_name?.trim()) {
    const company = await getOrCreateCompany(input.company_name.trim());
    companyId = company?.id ?? null;
  }
  const row: Record<string, unknown> = {
    name: input.name.trim(),
    brand: input.brand?.trim() || null,
    category: input.category || null,
    category_id: input.category_id ?? null,
    company_id: companyId,
    ingredients_text: input.ingredients_text?.trim() || null,
    barcode: input.barcode?.trim() || null,
    image_url: input.image_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (input.is_private != null) (row as Record<string, boolean>).is_private = input.is_private;
  if (input.rating != null) (row as Record<string, number | null>).rating = input.rating;
  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}
