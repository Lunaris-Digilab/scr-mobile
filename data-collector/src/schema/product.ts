import { z } from 'zod';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_TEXTURES,
  USAGE_FREQUENCIES,
  USAGE_TIMES,
  SIZE_UNITS,
  TARGET_AREAS,
} from '../scraper/types.js';

export const NormalizedProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brand: z.string().nullable(),
  category: z.enum(PRODUCT_CATEGORIES).nullable(),
  description: z.string().nullable(),
  ingredients_text: z.string().nullable(),
  ingredients: z.array(z.string()),
  image_url: z.string().url().nullable().or(z.literal(null)),
  barcode: z.string().nullable(),

  size_value: z.number().positive().nullable(),
  size_unit: z.enum(SIZE_UNITS).nullable(),
  usage_instructions: z.string().nullable(),
  usage_frequency: z.enum(USAGE_FREQUENCIES).nullable(),
  usage_time: z.enum(USAGE_TIMES).nullable(),
  texture: z.enum(PRODUCT_TEXTURES).nullable(),
  spf: z.number().int().min(1).max(100).nullable(),
  ph_level: z.number().min(0).max(14).nullable(),
  shelf_life_months: z.number().int().positive().nullable(),

  is_cruelty_free: z.boolean(),
  is_vegan: z.boolean(),
  is_fragrance_free: z.boolean(),
  is_paraben_free: z.boolean(),
  is_alcohol_free: z.boolean(),

  country_of_origin: z.string().nullable(),
  target_area: z.enum(TARGET_AREAS).nullable(),

  _source_url: z.string().url(),
  _scraped_at: z.string(),
  _site_id: z.string(),
});

export type ValidatedProduct = z.infer<typeof NormalizedProductSchema>;
