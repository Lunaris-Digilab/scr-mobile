import { supabase } from './supabase';
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
    .select('*')
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
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
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
  ingredients_text?: string;
  barcode?: string;
  image_url?: string;
}) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      brand: input.brand?.trim() || null,
      category: input.category || null,
      ingredients_text: input.ingredients_text?.trim() || null,
      barcode: input.barcode?.trim() || null,
      image_url: input.image_url?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}
