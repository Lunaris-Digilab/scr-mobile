import type { NormalizedProduct } from '../scraper/types.js';

/**
 * Dedup products by name + brand combination.
 * Keeps the first occurrence.
 */
export function dedup(products: NormalizedProduct[]): NormalizedProduct[] {
  const seen = new Set<string>();
  const result: NormalizedProduct[] = [];

  for (const p of products) {
    const key = `${(p.brand ?? '').toLowerCase().trim()}::${p.name.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  return result;
}
