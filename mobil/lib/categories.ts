import { supabase } from './supabase';
import type { Category } from '../types/category';

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, created_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}
