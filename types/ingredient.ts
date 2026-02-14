export type IngredientCategory =
  | 'active' | 'humectant' | 'emollient' | 'surfactant'
  | 'preservative' | 'antioxidant' | 'exfoliant' | 'fragrance'
  | 'solvent' | 'thickener' | 'emulsifier' | 'ph_adjuster' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  inci_name: string | null;
  description: string | null;
  category: IngredientCategory | null;
  comedogenic_rating: number | null;
  is_common_irritant: boolean;
  created_at?: string;
}

export interface SkinType {
  id: string;
  name: string;
}

export interface SkinConcern {
  id: string;
  name: string;
}
