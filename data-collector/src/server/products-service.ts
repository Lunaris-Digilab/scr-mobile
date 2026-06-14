import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './supabase.js';
import { logger } from '../utils/logger.js';

// ── Input shape coming from the admin form ──

export interface ProductInput {
  name: string;
  brand?: string | null;
  /** Seçilen kayıtlı markanın id'si (select box). */
  company_id?: string | null;
  /** Marka adı; eşleşen company yoksa oluşturulur (legacy/scraper yolu). */
  company_name?: string | null;
  category_id?: string | null;
  description?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  ingredients_text?: string | null;

  size_value?: number | null;
  size_unit?: string | null;
  usage_instructions?: string | null;
  usage_frequency?: string | null;
  usage_time?: string | null;
  texture?: string | null;
  spf?: number | null;
  ph_level?: number | null;
  shelf_life_months?: number | null;

  is_cruelty_free?: boolean;
  is_vegan?: boolean;
  is_fragrance_free?: boolean;
  is_paraben_free?: boolean;
  is_alcohol_free?: boolean;

  country_of_origin?: string | null;
  target_area?: string | null;
  is_private?: boolean;

  /** Sıralı içerik adları (get-or-create). */
  ingredients?: string[];
  skin_type_ids?: string[];
  concern_ids?: string[];
}

export interface ListOptions {
  search?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

// ── List ──

export async function listProducts(opts: ListOptions): Promise<{ items: unknown[]; total: number }> {
  const db = getServiceClient();
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  let query = db
    .from('products')
    .select('id, name, brand, image_url, category, category_id, is_private, companies(name)', {
      count: 'exact',
    })
    .order('name', { ascending: true });

  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  }
  if (opts.categoryId) {
    query = query.eq('category_id', opts.categoryId);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}

// ── Read one (with relations) ──

export async function getProduct(id: string): Promise<unknown> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('products')
    .select(
      `*, companies(name),
       product_ingredients(position, ingredients(id, name)),
       product_skin_types(skin_type_id),
       product_concerns(concern_id)`,
    )
    .eq('id', id)
    .single();
  if (error) throw error;

  const row = data as Record<string, any>;
  const ingredients = (row.product_ingredients ?? [])
    .slice()
    .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    .map((pi: any) => pi.ingredients?.name)
    .filter(Boolean);
  const skin_type_ids = (row.product_skin_types ?? []).map((r: any) => r.skin_type_id);
  const concern_ids = (row.product_concerns ?? []).map((r: any) => r.concern_id);

  return { ...row, ingredients, skin_type_ids, concern_ids };
}

// ── Create ──

export async function createProduct(input: ProductInput): Promise<{ id: string }> {
  const db = getServiceClient();
  const row = await buildProductRow(db, input);

  const { data, error } = await db.from('products').insert(row).select('id').single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  await replaceRelations(db, id, input);
  logger.info({ id, name: input.name }, 'Product created');
  return { id };
}

// ── Update ──

export async function updateProduct(id: string, input: ProductInput): Promise<{ id: string }> {
  const db = getServiceClient();
  const row = await buildProductRow(db, input);
  row.updated_at = new Date().toISOString();

  const { error } = await db.from('products').update(row).eq('id', id);
  if (error) throw error;

  await replaceRelations(db, id, input);
  logger.info({ id, name: input.name }, 'Product updated');
  return { id };
}

// ── Delete ──

export async function deleteProduct(id: string): Promise<void> {
  const db = getServiceClient();
  // Junction rows are removed via ON DELETE CASCADE.
  const { error } = await db.from('products').delete().eq('id', id);
  if (error) throw error;
  logger.info({ id }, 'Product deleted');
}

// ── Helpers ──

async function buildProductRow(
  db: SupabaseClient,
  input: ProductInput,
): Promise<Record<string, unknown>> {
  // Prefer an explicitly chosen company (select box). Fall back to get-or-create
  // by name (legacy free-text / scraper path).
  let companyId: string | null = clean(input.company_id);
  let brand = clean(input.brand);
  if (!companyId) {
    const companyName = clean(input.company_name) ?? brand;
    if (companyName) companyId = await getOrCreateCompany(db, companyName);
  }

  return {
    name: input.name.trim(),
    brand,
    company_id: companyId,
    category_id: input.category_id ?? null,
    category: input.category_id ? await categoryEnumFromId(db, input.category_id) : null,
    description: clean(input.description),
    barcode: clean(input.barcode),
    image_url: clean(input.image_url),
    ingredients_text: clean(input.ingredients_text),
    size_value: numOrNull(input.size_value),
    size_unit: clean(input.size_unit),
    usage_instructions: clean(input.usage_instructions),
    usage_frequency: clean(input.usage_frequency),
    usage_time: clean(input.usage_time),
    texture: clean(input.texture),
    spf: numOrNull(input.spf),
    ph_level: numOrNull(input.ph_level),
    shelf_life_months: numOrNull(input.shelf_life_months),
    is_cruelty_free: !!input.is_cruelty_free,
    is_vegan: !!input.is_vegan,
    is_fragrance_free: !!input.is_fragrance_free,
    is_paraben_free: !!input.is_paraben_free,
    is_alcohol_free: !!input.is_alcohol_free,
    country_of_origin: clean(input.country_of_origin),
    target_area: clean(input.target_area),
    is_private: !!input.is_private,
  };
}

async function replaceRelations(
  db: SupabaseClient,
  productId: string,
  input: ProductInput,
): Promise<void> {
  if (input.ingredients !== undefined) {
    await db.from('product_ingredients').delete().eq('product_id', productId);
    const names = input.ingredients.map((n) => n.trim()).filter(Boolean);
    for (let i = 0; i < names.length; i++) {
      try {
        const ingredientId = await getOrCreateIngredient(db, names[i]);
        await db
          .from('product_ingredients')
          .insert({ product_id: productId, ingredient_id: ingredientId, position: i });
      } catch (err) {
        logger.debug({ ingredient: names[i], err: String(err) }, 'Failed to link ingredient');
      }
    }
  }

  if (input.skin_type_ids !== undefined) {
    await db.from('product_skin_types').delete().eq('product_id', productId);
    const rows = uniq(input.skin_type_ids).map((skin_type_id) => ({
      product_id: productId,
      skin_type_id,
    }));
    if (rows.length) await db.from('product_skin_types').insert(rows);
  }

  if (input.concern_ids !== undefined) {
    await db.from('product_concerns').delete().eq('product_id', productId);
    const rows = uniq(input.concern_ids).map((concern_id) => ({
      product_id: productId,
      concern_id,
    }));
    if (rows.length) await db.from('product_concerns').insert(rows);
  }
}

export async function getOrCreateCompany(db: SupabaseClient, name: string): Promise<string> {
  const { data: existing } = await db
    .from('companies')
    .select('id')
    .ilike('name', name)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await db
    .from('companies')
    .insert({ name })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create company: ${error.message}`);
  return (created as { id: string }).id;
}

export async function getOrCreateIngredient(db: SupabaseClient, name: string): Promise<string> {
  const trimmed = name.trim();
  const { data: existing } = await db
    .from('ingredients')
    .select('id')
    .ilike('name', trimmed)
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await db
    .from('ingredients')
    .insert({ name: trimmed })
    .select('id')
    .single();
  if (error) throw new Error(`Failed to create ingredient: ${error.message}`);
  return (created as { id: string }).id;
}

// categories tablosundaki ada karşılık gelen products.category enum değeri (mobil filtreleri için).
const CATEGORY_NAME_TO_ENUM: Record<string, string> = {
  Cleanser: 'cleanser',
  Toner: 'toner',
  Serum: 'serum',
  Moisturizer: 'moisturizer',
  Suncare: 'sunscreen',
  Mask: 'mask',
  Treatment: 'treatment',
  'Eye care': 'eye_cream',
};

async function categoryEnumFromId(db: SupabaseClient, categoryId: string): Promise<string> {
  const { data } = await db
    .from('categories')
    .select('name')
    .eq('id', categoryId)
    .maybeSingle();
  const name = (data as { name?: string } | null)?.name;
  if (!name) return 'other';
  return CATEGORY_NAME_TO_ENUM[name] ?? 'other';
}

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function numOrNull(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Number.isFinite(v) ? v : null;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
