import { Router } from 'express';
import { getServiceClient } from '../supabase.js';

// Lookup data for the product form: brands, categories, ingredients, skin types/concerns.
export const taxonomyRouter = Router();

// GET /api/companies?search=  — autocomplete (limit 20)
// GET /api/companies?all=1    — full list for the brand select box
taxonomyRouter.get('/companies', async (req, res) => {
  try {
    const term = str(req.query.search);
    const all = req.query.all === '1' || req.query.all === 'true';
    let query = getServiceClient().from('companies').select('id, name').order('name');
    if (term) query = query.ilike('name', `%${escapeLike(term)}%`);
    if (!all) query = query.limit(20);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// GET /api/categories
taxonomyRouter.get('/categories', async (_req, res) => {
  try {
    const { data, error } = await getServiceClient()
      .from('categories')
      .select('id, name')
      .order('name');
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// GET /api/ingredients?search= — ingredient autocomplete
taxonomyRouter.get('/ingredients', async (req, res) => {
  try {
    const term = str(req.query.search);
    let query = getServiceClient().from('ingredients').select('id, name').order('name').limit(20);
    if (term) query = query.ilike('name', `%${escapeLike(term)}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// GET /api/skin-types
taxonomyRouter.get('/skin-types', async (_req, res) => {
  try {
    const { data, error } = await getServiceClient()
      .from('skin_types')
      .select('id, name')
      .order('name');
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// GET /api/skin-concerns
taxonomyRouter.get('/skin-concerns', async (_req, res) => {
  try {
    const { data, error } = await getServiceClient()
      .from('skin_concerns')
      .select('id, name')
      .order('name');
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
function escapeLike(s: string): string {
  return s.replace(/%/g, '\\%').replace(/_/g, '\\_');
}
function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
