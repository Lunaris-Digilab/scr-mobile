import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedProduct } from '../scraper/types.js';
import { logger } from '../utils/logger.js';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  }

  client = createClient(url, key);
  return client;
}

/**
 * Insert a normalized product into Supabase.
 * Follows the same patterns as mobil/lib/ (getOrCreateCompany, getOrCreateIngredient).
 */
export async function writeToSupabase(product: NormalizedProduct): Promise<void> {
  const db = getClient();

  // 1. Get or create company
  let companyId: string | null = null;
  if (product.brand) {
    companyId = await getOrCreateCompany(db, product.brand);
  }

  // 2. Resolve category_id
  let categoryId: string | null = null;
  if (product.category) {
    categoryId = await resolveCategoryId(db, product.category);
  }

  // 3. Check for existing product (dedup)
  const { data: existing } = await db
    .from('products')
    .select('id')
    .eq('name', product.name)
    .eq('company_id', companyId ?? '')
    .maybeSingle();

  if (existing) {
    logger.info({ name: product.name, id: existing.id }, 'Product already exists, skipping');
    return;
  }

  // 4. Insert product
  const { data: inserted, error: insertError } = await db
    .from('products')
    .insert({
      name: product.name,
      brand: product.brand,
      category: product.category,
      category_id: categoryId,
      company_id: companyId,
      description: product.description,
      ingredients_text: product.ingredients_text,
      image_url: product.image_url,
      barcode: product.barcode,
      size_value: product.size_value,
      size_unit: product.size_unit,
      usage_instructions: product.usage_instructions,
      usage_frequency: product.usage_frequency,
      usage_time: product.usage_time,
      texture: product.texture,
      spf: product.spf,
      ph_level: product.ph_level,
      shelf_life_months: product.shelf_life_months,
      is_cruelty_free: product.is_cruelty_free,
      is_vegan: product.is_vegan,
      is_fragrance_free: product.is_fragrance_free,
      is_paraben_free: product.is_paraben_free,
      is_alcohol_free: product.is_alcohol_free,
      country_of_origin: product.country_of_origin,
      target_area: product.target_area,
      is_private: false,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to insert product: ${insertError?.message ?? 'unknown'}`);
  }

  logger.info({ name: product.name, id: inserted.id }, 'Product inserted');

  // 5. Insert ingredients
  if (product.ingredients.length > 0) {
    await insertProductIngredients(db, inserted.id, product.ingredients);
  }
}

async function getOrCreateCompany(db: SupabaseClient, name: string): Promise<string> {
  const { data: existing } = await db
    .from('companies')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await db
    .from('companies')
    .insert({ name })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create company: ${error.message}`);
  return created!.id;
}

async function resolveCategoryId(db: SupabaseClient, category: string): Promise<string | null> {
  // Map ProductCategory enum to seeded category names
  const categoryNameMap: Record<string, string> = {
    cleanser: 'Cleanser',
    toner: 'Toner',
    serum: 'Serum',
    moisturizer: 'Moisturizer',
    sunscreen: 'Suncare',
    mask: 'Mask',
    treatment: 'Treatment',
    eye_cream: 'Eye care',
    other: 'Treatment',
  };

  const name = categoryNameMap[category];
  if (!name) return null;

  const { data } = await db
    .from('categories')
    .select('id')
    .ilike('name', name)
    .maybeSingle();

  return data?.id ?? null;
}

async function insertProductIngredients(
  db: SupabaseClient,
  productId: string,
  ingredientNames: string[],
): Promise<void> {
  for (let i = 0; i < ingredientNames.length; i++) {
    try {
      const ingredientId = await getOrCreateIngredient(db, ingredientNames[i]);

      await db.from('product_ingredients').insert({
        product_id: productId,
        ingredient_id: ingredientId,
        position: i,
      });
    } catch (err) {
      logger.debug({ ingredient: ingredientNames[i], err: String(err) }, 'Failed to insert ingredient');
    }
  }
}

async function getOrCreateIngredient(db: SupabaseClient, name: string): Promise<string> {
  const { data: existing } = await db
    .from('ingredients')
    .select('id')
    .ilike('name', name.trim())
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await db
    .from('ingredients')
    .insert({ name: name.trim() })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create ingredient: ${error.message}`);
  return created!.id;
}
