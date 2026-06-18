import type {
  ProductCategory,
  ProductTexture,
  UsageTime,
  SizeUnit,
  TargetArea,
} from '../types/product';
import type { PreparedImage } from './storage';

/**
 * Shared shape produced by both the barcode lookup and the AI vision extraction,
 * used to pre-fill the add-product form. Every field is optional — only what was
 * detected is set.
 */
export interface ProductPrefill {
  name?: string;
  brand?: string;
  category?: ProductCategory;
  ingredients_text?: string;
  description?: string;
  size_value?: number;
  size_unit?: SizeUnit;
  spf?: number;
  texture?: ProductTexture;
  usage_time?: UsageTime;
  target_area?: TargetArea;
  is_vegan?: boolean;
  is_cruelty_free?: boolean;
  is_fragrance_free?: boolean;
  is_paraben_free?: boolean;
  is_alcohol_free?: boolean;
  barcode?: string;
  /** Keys that were auto-detected — the form highlights these for review. */
  autoFilledKeys?: string[];
  /** Locally captured/prepared photo to attach (from the scan flow). */
  photo?: PreparedImage | null;
  /** Remote image URL (e.g. from Open Beauty Facts) when there is no local photo. */
  imageUrl?: string;
  source?: 'barcode' | 'ai';
}

// In-memory handoff between the scan screen and the add form. Avoids pushing
// large strings (ingredient lists) and binary (photos) through route params.
let pending: ProductPrefill | null = null;

export function setPendingPrefill(prefill: ProductPrefill | null): void {
  pending = prefill;
}

/** Returns the pending prefill once, then clears it. */
export function takePendingPrefill(): ProductPrefill | null {
  const p = pending;
  pending = null;
  return p;
}
