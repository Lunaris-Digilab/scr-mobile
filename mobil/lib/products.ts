import { supabase } from './supabase';
import { getOrCreateCompany } from './companies';
import type {
  Product,
  ProductCategory,
  ProductTexture,
  UsageFrequency,
  UsageTime,
  SizeUnit,
  TargetArea,
} from '../types/product';

export async function getProducts(options?: {
  search?: string;
  category?: ProductCategory;
  brand?: string;
  texture?: ProductTexture;
  usage_time?: UsageTime;
  target_area?: TargetArea;
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
  if (options?.texture) query = query.eq('texture', options.texture);
  if (options?.usage_time) query = query.eq('usage_time', options.usage_time);
  if (options?.target_area) query = query.eq('target_area', options.target_area);

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

export interface CreateProductInput {
  name: string;
  brand?: string;
  category?: ProductCategory;
  category_id?: string | null;
  company_id?: string | null;
  company_name?: string;
  description?: string;
  ingredients_text?: string;
  barcode?: string;
  image_url?: string;
  is_private?: boolean;
  rating?: number | null;
  // Skincare fields
  size_value?: number | null;
  size_unit?: SizeUnit | null;
  usage_instructions?: string;
  usage_frequency?: UsageFrequency | null;
  usage_time?: UsageTime | null;
  texture?: ProductTexture | null;
  spf?: number | null;
  ph_level?: number | null;
  shelf_life_months?: number | null;
  is_cruelty_free?: boolean;
  is_vegan?: boolean;
  is_fragrance_free?: boolean;
  is_paraben_free?: boolean;
  is_alcohol_free?: boolean;
  country_of_origin?: string;
  target_area?: TargetArea | null;
}

export async function createProduct(input: CreateProductInput) {
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
    description: input.description?.trim() || null,
    ingredients_text: input.ingredients_text?.trim() || null,
    barcode: input.barcode?.trim() || null,
    image_url: input.image_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // Boolean fields
  if (input.is_private != null) row.is_private = input.is_private;
  if (input.is_cruelty_free != null) row.is_cruelty_free = input.is_cruelty_free;
  if (input.is_vegan != null) row.is_vegan = input.is_vegan;
  if (input.is_fragrance_free != null) row.is_fragrance_free = input.is_fragrance_free;
  if (input.is_paraben_free != null) row.is_paraben_free = input.is_paraben_free;
  if (input.is_alcohol_free != null) row.is_alcohol_free = input.is_alcohol_free;

  // Numeric fields
  if (input.rating != null) row.rating = input.rating;
  if (input.size_value != null) row.size_value = input.size_value;
  if (input.spf != null) row.spf = input.spf;
  if (input.ph_level != null) row.ph_level = input.ph_level;
  if (input.shelf_life_months != null) row.shelf_life_months = input.shelf_life_months;

  // Enum fields
  if (input.size_unit) row.size_unit = input.size_unit;
  if (input.usage_frequency) row.usage_frequency = input.usage_frequency;
  if (input.usage_time) row.usage_time = input.usage_time;
  if (input.texture) row.texture = input.texture;
  if (input.target_area) row.target_area = input.target_area;

  // Text fields
  if (input.usage_instructions?.trim()) row.usage_instructions = input.usage_instructions.trim();
  if (input.country_of_origin?.trim()) row.country_of_origin = input.country_of_origin.trim();

  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(
  id: string,
  updates: Partial<CreateProductInput>
) {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) row.name = updates.name.trim();
  if (updates.brand !== undefined) row.brand = updates.brand?.trim() || null;
  if (updates.category !== undefined) row.category = updates.category || null;
  if (updates.category_id !== undefined) row.category_id = updates.category_id;
  if (updates.description !== undefined) row.description = updates.description?.trim() || null;
  if (updates.ingredients_text !== undefined) row.ingredients_text = updates.ingredients_text?.trim() || null;
  if (updates.barcode !== undefined) row.barcode = updates.barcode?.trim() || null;
  if (updates.image_url !== undefined) row.image_url = updates.image_url?.trim() || null;
  if (updates.usage_instructions !== undefined) row.usage_instructions = updates.usage_instructions?.trim() || null;
  if (updates.country_of_origin !== undefined) row.country_of_origin = updates.country_of_origin?.trim() || null;

  if (updates.is_private != null) row.is_private = updates.is_private;
  if (updates.is_cruelty_free != null) row.is_cruelty_free = updates.is_cruelty_free;
  if (updates.is_vegan != null) row.is_vegan = updates.is_vegan;
  if (updates.is_fragrance_free != null) row.is_fragrance_free = updates.is_fragrance_free;
  if (updates.is_paraben_free != null) row.is_paraben_free = updates.is_paraben_free;
  if (updates.is_alcohol_free != null) row.is_alcohol_free = updates.is_alcohol_free;

  if (updates.rating !== undefined) row.rating = updates.rating;
  if (updates.size_value !== undefined) row.size_value = updates.size_value;
  if (updates.size_unit !== undefined) row.size_unit = updates.size_unit;
  if (updates.spf !== undefined) row.spf = updates.spf;
  if (updates.ph_level !== undefined) row.ph_level = updates.ph_level;
  if (updates.shelf_life_months !== undefined) row.shelf_life_months = updates.shelf_life_months;
  if (updates.usage_frequency !== undefined) row.usage_frequency = updates.usage_frequency;
  if (updates.usage_time !== undefined) row.usage_time = updates.usage_time;
  if (updates.texture !== undefined) row.texture = updates.texture;
  if (updates.target_area !== undefined) row.target_area = updates.target_area;

  // Handle company change
  if (updates.company_id !== undefined) {
    row.company_id = updates.company_id;
  } else if (updates.company_name?.trim()) {
    const company = await getOrCreateCompany(updates.company_name.trim());
    row.company_id = company?.id ?? null;
  }

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}
