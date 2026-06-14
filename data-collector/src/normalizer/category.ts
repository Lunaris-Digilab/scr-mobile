import type { ProductCategory } from '../scraper/types.js';

const CATEGORY_KEYWORDS: Array<[ProductCategory, string[]]> = [
  ['cleanser', ['cleanser', 'cleansing', 'face wash', 'facial wash', 'micellar', 'makeup remover']],
  ['toner', ['toner', 'toning', 'essence', 'facial mist', 'prep']],
  ['serum', ['serum', 'ampoule', 'concentrate', 'booster', 'elixir']],
  ['moisturizer', ['moisturizer', 'moisturiser', 'moisturizing', 'hydrating cream', 'day cream', 'night cream', 'face cream', 'facial cream']],
  ['sunscreen', ['sunscreen', 'spf', 'sun protect', 'sun cream', 'sun block', 'uv protect', 'solar']],
  ['mask', ['mask', 'masque', 'peel-off', 'sheet mask', 'clay mask', 'sleeping mask']],
  ['eye_cream', ['eye cream', 'eye gel', 'under eye', 'eye serum', 'eye balm']],
  ['treatment', ['treatment', 'spot treatment', 'acne', 'retinol', 'retinoid', 'aha', 'bha', 'exfoliant', 'peel']],
];

/**
 * Map raw category/name text to ProductCategory enum.
 */
export function normalizeCategory(rawCategory: string, rawName: string): ProductCategory | null {
  const combined = `${rawCategory} ${rawName}`.toLowerCase();

  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        return category;
      }
    }
  }

  return null;
}
