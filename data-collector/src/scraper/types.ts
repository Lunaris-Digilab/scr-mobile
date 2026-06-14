import type { Page } from 'playwright';

// ── Enums matching mobil/types/product.ts ──

export const PRODUCT_CATEGORIES = [
  'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen',
  'mask', 'treatment', 'eye_cream', 'other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_TEXTURES = [
  'cream', 'gel', 'liquid', 'foam', 'oil', 'balm', 'serum',
  'mist', 'paste', 'powder', 'lotion', 'spray', 'stick', 'patch', 'other',
] as const;
export type ProductTexture = (typeof PRODUCT_TEXTURES)[number];

export const USAGE_FREQUENCIES = ['daily', 'twice_daily', 'weekly', 'as_needed'] as const;
export type UsageFrequency = (typeof USAGE_FREQUENCIES)[number];

export const USAGE_TIMES = ['AM', 'PM', 'both'] as const;
export type UsageTime = (typeof USAGE_TIMES)[number];

export const SIZE_UNITS = ['ml', 'g', 'oz', 'fl_oz', 'pcs'] as const;
export type SizeUnit = (typeof SIZE_UNITS)[number];

export const TARGET_AREAS = [
  'face', 'eye', 'lip', 'body', 'hand', 'hair', 'nail', 'scalp', 'full_body',
] as const;
export type TargetArea = (typeof TARGET_AREAS)[number];

// ── Pre-actions for dynamic pages ──

export interface PreAction {
  type: 'click' | 'scroll' | 'wait';
  selector?: string;
  timeout?: number;
}

// ── Site config ──

export interface SiteConfig {
  id: string;
  name: string;
  baseUrl: string;
  strategy: 'playwright' | 'cheerio';

  listing: {
    urlTemplate: string;
    productLinkSelector: string;
    nextPageSelector?: string;
    maxPages?: number;
    maxProducts?: number;
  };

  selectors: {
    name: string;
    brand: string;
    description: string;
    image: string;
    ingredients: string;
    size: string;
    howToUse: string;
    claims: string;
    spf: string;
    shelfLife: string;
    category: string;
  };

  preActions?: PreAction[];
  customExtractors?: Record<string, (page: Page) => Promise<string>>;
  rateLimit?: { concurrency: number; delayMs: number };
}

// ── Scraped product (raw) ──

export interface ScrapedProduct {
  rawName: string;
  rawBrand: string;
  rawDescription: string;
  rawIngredients: string;
  rawImage: string;
  rawSize: string;
  rawHowToUse: string;
  rawClaims: string[];
  rawCategory: string;
  rawSpf: string;
  rawShelfLife: string;
  sourceUrl: string;
  scrapedAt: string;
  siteId: string;
}

// ── Normalized product (matches Glowist schema) ──

export interface NormalizedProduct {
  name: string;
  brand: string | null;
  category: ProductCategory | null;
  description: string | null;
  ingredients_text: string | null;
  ingredients: string[];
  image_url: string | null;
  barcode: string | null;

  size_value: number | null;
  size_unit: SizeUnit | null;
  usage_instructions: string | null;
  usage_frequency: UsageFrequency | null;
  usage_time: UsageTime | null;
  texture: ProductTexture | null;
  spf: number | null;
  ph_level: number | null;
  shelf_life_months: number | null;

  is_cruelty_free: boolean;
  is_vegan: boolean;
  is_fragrance_free: boolean;
  is_paraben_free: boolean;
  is_alcohol_free: boolean;

  country_of_origin: string | null;
  target_area: TargetArea | null;

  _source_url: string;
  _scraped_at: string;
  _site_id: string;
}

// ── Scrape result ──

export interface ScrapeResult {
  siteId: string;
  products: NormalizedProduct[];
  errors: Array<{ url: string; error: string }>;
  stats: {
    urlsDiscovered: number;
    scraped: number;
    normalized: number;
    failed: number;
    durationMs: number;
  };
}
