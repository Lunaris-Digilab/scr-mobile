import type { SizeUnit } from '../types/product';
import type { ProductPrefill } from './product-prefill';

// Open Beauty Facts — the cosmetics sibling of Open Food Facts. Free, no key.
const OBF_BASE = 'https://world.openbeautyfacts.org/api/v2/product';
const TIMEOUT_MS = 8000;

/**
 * Looks up a cosmetic product by barcode in Open Beauty Facts and maps the
 * result to a ProductPrefill. Returns null on miss, error, or timeout — callers
 * fall through to AI extraction.
 */
export async function lookupByBarcode(barcode: string): Promise<ProductPrefill | null> {
  const code = barcode.trim();
  if (!code) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url =
      `${OBF_BASE}/${encodeURIComponent(code)}.json` +
      `?fields=product_name,brands,ingredients_text,quantity,image_url`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Glowist/1.0 (skincare routine app)' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 1 || !json.product) return null;

    const p = json.product;
    const prefill: ProductPrefill = { barcode: code, source: 'barcode' };
    const keys: string[] = [];

    if (typeof p.product_name === 'string' && p.product_name.trim()) {
      prefill.name = p.product_name.trim();
      keys.push('name');
    }
    if (typeof p.brands === 'string' && p.brands.trim()) {
      prefill.brand = p.brands.split(',')[0].trim();
      keys.push('brand');
    }
    if (typeof p.ingredients_text === 'string' && p.ingredients_text.trim()) {
      prefill.ingredients_text = p.ingredients_text.trim();
      keys.push('ingredients_text');
    }
    const size = parseQuantity(p.quantity);
    if (size) {
      prefill.size_value = size.value;
      prefill.size_unit = size.unit;
      keys.push('size_value');
    }
    if (typeof p.image_url === 'string' && p.image_url.startsWith('http')) {
      prefill.imageUrl = p.image_url;
    }

    if (keys.length === 0) return null; // record exists but has nothing useful
    prefill.autoFilledKeys = keys;
    return prefill;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Parses strings like "50 ml", "1,7 fl oz", "30g" into a value + unit. */
function parseQuantity(q: unknown): { value: number; unit: SizeUnit } | null {
  if (typeof q !== 'string') return null;
  const m = q.match(/([\d.,]+)\s*(ml|g|oz|fl\s?oz)/i);
  if (!m) return null;
  const value = parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  const u = m[2].toLowerCase().replace(/\s/g, '');
  const unit: SizeUnit =
    u === 'g' ? 'g' : u === 'oz' ? 'oz' : u === 'floz' ? 'fl_oz' : 'ml';
  return { value, unit };
}
