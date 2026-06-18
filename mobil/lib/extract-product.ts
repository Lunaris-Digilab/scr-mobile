import { supabase } from './supabase';
import type { ProductPrefill } from './product-prefill';
import type { PreparedImage } from './storage';

// Keys we accept from the AI extraction (must exist on ProductPrefill and on the
// Edge Function's JSON schema). detected_language is intentionally excluded.
const PREFILL_KEYS = [
  'name', 'brand', 'category', 'ingredients_text', 'description',
  'size_value', 'size_unit', 'spf', 'texture', 'usage_time', 'target_area',
  'is_vegan', 'is_cruelty_free', 'is_fragrance_free', 'is_paraben_free', 'is_alcohol_free',
] as const;

/**
 * Sends a prepared label photo to the `extract-product` Edge Function and maps
 * the structured result to a ProductPrefill. Returns null on any failure so the
 * caller can fall back to manual entry. The captured photo is carried through so
 * the form can attach it on save.
 */
export async function extractProductFromPhoto(
  image: PreparedImage,
  locale: string
): Promise<ProductPrefill | null> {
  try {
    const { data, error } = await supabase.functions.invoke('extract-product', {
      body: { image_base64: image.base64, media_type: image.mediaType, locale },
    });
    if (error) return null;
    const fields = (data as { fields?: Record<string, unknown> } | null)?.fields;
    if (!fields) return null;

    const prefill: ProductPrefill = { source: 'ai', photo: image };
    const keys: string[] = [];
    for (const key of PREFILL_KEYS) {
      const value = fields[key];
      if (value === undefined || value === null || value === '') continue;
      // Values originate from a schema-constrained model response.
      (prefill as Record<string, unknown>)[key] = value;
      keys.push(key);
    }
    prefill.autoFilledKeys = keys;
    return keys.length > 0 ? prefill : null;
  } catch {
    return null;
  }
}
