import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductInput,
} from '../products-service.js';

export const productsRouter = Router();

// GET /api/products — list (search, category filter, pagination)
productsRouter.get('/', async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const offset = clampInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const result = await listProducts({
      search: str(req.query.search),
      categoryId: str(req.query.category_id),
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// GET /api/products/:id — single product with relations
productsRouter.get('/:id', async (req, res) => {
  try {
    const product = await getProduct(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(404).json({ error: msg(err) });
  }
});

// POST /api/products — create
productsRouter.post('/', async (req, res) => {
  const input = req.body as ProductInput;
  if (!input?.name?.trim()) {
    return res.status(400).json({ error: 'Ürün adı gerekli' });
  }
  try {
    const result = await createProduct(input);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// PUT /api/products/:id — update
productsRouter.put('/:id', async (req, res) => {
  const input = req.body as ProductInput;
  if (!input?.name?.trim()) {
    return res.status(400).json({ error: 'Ürün adı gerekli' });
  }
  try {
    const result = await updateProduct(req.params.id, input);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// DELETE /api/products/:id
productsRouter.delete('/:id', async (req, res) => {
  try {
    await deleteProduct(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: msg(err) });
  }
});

// ── helpers ──
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = parseInt(String(v ?? ''), 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
