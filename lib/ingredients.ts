import { supabase } from './supabase';
import type { Ingredient, SkinType, SkinConcern } from '../types/ingredient';

/* ────────── Skin Types ────────── */

export async function getSkinTypes(): Promise<SkinType[]> {
  const { data, error } = await supabase
    .from('skin_types')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return (data ?? []) as SkinType[];
}

/* ────────── Skin Concerns ────────── */

export async function getSkinConcerns(): Promise<SkinConcern[]> {
  const { data, error } = await supabase
    .from('skin_concerns')
    .select('id, name')
    .order('name');
  if (error) throw error;
  return (data ?? []) as SkinConcern[];
}

/* ────────── Ingredients ────────── */

export async function searchIngredients(query: string): Promise<Ingredient[]> {
  const term = query.trim();
  if (!term) return [];
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .or(`name.ilike.%${term}%,inci_name.ilike.%${term}%`)
    .order('name')
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Ingredient[];
}

export async function getOrCreateIngredient(name: string): Promise<Ingredient> {
  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from('ingredients')
    .select('*')
    .ilike('name', trimmed)
    .maybeSingle();
  if (existing) return existing as Ingredient;

  const { data, error } = await supabase
    .from('ingredients')
    .insert({ name: trimmed })
    .select('*')
    .single();
  if (error) throw error;
  return data as Ingredient;
}

/* ────────── Product ↔ Skin Types ────────── */

export async function getProductSkinTypes(productId: string): Promise<SkinType[]> {
  const { data, error } = await supabase
    .from('product_skin_types')
    .select('skin_type_id, skin_types(id, name)')
    .eq('product_id', productId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.skin_types).filter(Boolean) as SkinType[];
}

export async function setProductSkinTypes(productId: string, skinTypeIds: string[]): Promise<void> {
  await supabase.from('product_skin_types').delete().eq('product_id', productId);
  if (skinTypeIds.length === 0) return;
  const rows = skinTypeIds.map((id) => ({ product_id: productId, skin_type_id: id }));
  const { error } = await supabase.from('product_skin_types').insert(rows);
  if (error) throw error;
}

/* ────────── Product ↔ Skin Concerns ────────── */

export async function getProductConcerns(productId: string): Promise<SkinConcern[]> {
  const { data, error } = await supabase
    .from('product_concerns')
    .select('concern_id, skin_concerns(id, name)')
    .eq('product_id', productId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.skin_concerns).filter(Boolean) as SkinConcern[];
}

export async function setProductConcerns(productId: string, concernIds: string[]): Promise<void> {
  await supabase.from('product_concerns').delete().eq('product_id', productId);
  if (concernIds.length === 0) return;
  const rows = concernIds.map((id) => ({ product_id: productId, concern_id: id }));
  const { error } = await supabase.from('product_concerns').insert(rows);
  if (error) throw error;
}

/* ────────── Product ↔ Ingredients ────────── */

export async function getProductIngredients(productId: string): Promise<(Ingredient & { position: number })[]> {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('position, ingredient_id, ingredients(*)')
    .eq('product_id', productId)
    .order('position');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r.ingredients, position: r.position })).filter(Boolean);
}

export async function setProductIngredients(
  productId: string,
  ingredientIds: string[]
): Promise<void> {
  await supabase.from('product_ingredients').delete().eq('product_id', productId);
  if (ingredientIds.length === 0) return;
  const rows = ingredientIds.map((id, i) => ({
    product_id: productId,
    ingredient_id: id,
    position: i,
  }));
  const { error } = await supabase.from('product_ingredients').insert(rows);
  if (error) throw error;
}
