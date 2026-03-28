export type ProductCategory =
  | 'cleanser'
  | 'toner'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'mask'
  | 'treatment'
  | 'eye_cream'
  | 'other';

export type ProductTexture =
  | 'cream' | 'gel' | 'liquid' | 'foam' | 'oil' | 'balm'
  | 'serum' | 'mist' | 'paste' | 'powder' | 'lotion'
  | 'spray' | 'stick' | 'patch' | 'other';

export type UsageFrequency = 'daily' | 'twice_daily' | 'weekly' | 'as_needed';
export type UsageTime = 'AM' | 'PM' | 'both';
export type SizeUnit = 'ml' | 'g' | 'oz' | 'fl_oz' | 'pcs';
export type TargetArea = 'face' | 'eye' | 'lip' | 'body' | 'hand' | 'hair' | 'nail' | 'scalp' | 'full_body';

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory | null;
  category_id: string | null;
  company_id: string | null;
  /** Join ile gelen marka adı (companies tablosundan) */
  companies?: { name: string } | null;
  description: string | null;
  ingredients_text: string | null;
  barcode: string | null;
  image_url: string | null;
  is_private?: boolean;
  rating?: number | null;

  // Skincare-specific fields
  size_value?: number | null;
  size_unit?: SizeUnit | null;
  usage_instructions?: string | null;
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
  country_of_origin?: string | null;
  target_area?: TargetArea | null;

  created_at: string;
  updated_at: string;
}

/** Kartlarda gösterilecek marka: company varsa companies.name, yoksa brand */
export function getProductBrandDisplay(product: Product): string | null {
  return product.companies?.name ?? product.brand ?? null;
}

/** Ürün boyutunu okunabilir formatta döner (örn. "50 ml") */
export function formatProductSize(product: Product): string | null {
  if (!product.size_value) return null;
  return `${product.size_value} ${product.size_unit ?? 'ml'}`;
}

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  cleanser: 'Temizleyici',
  toner: 'Tonik',
  serum: 'Serum',
  moisturizer: 'Nemlendirici',
  sunscreen: 'Güneş Kremi',
  mask: 'Maske',
  treatment: 'Tedavi',
  eye_cream: 'Göz Kremi',
  other: 'Diğer',
};

export const TEXTURE_LABELS: Record<ProductTexture, string> = {
  cream: 'Krem',
  gel: 'Jel',
  liquid: 'Sıvı',
  foam: 'Köpük',
  oil: 'Yağ',
  balm: 'Balm',
  serum: 'Serum',
  mist: 'Mist/Sprey',
  paste: 'Macun',
  powder: 'Pudra',
  lotion: 'Losyon',
  spray: 'Sprey',
  stick: 'Stick',
  patch: 'Patch',
  other: 'Diğer',
};
