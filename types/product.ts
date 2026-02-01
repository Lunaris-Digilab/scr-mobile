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

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory | null;
  ingredients_text: string | null;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
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
