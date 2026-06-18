import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getServiceClient } from '../supabase.js';
import { logger } from '../../utils/logger.js';

export const uploadRouter = Router();

const BUCKET = 'product-photos';
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// POST /api/upload — { filename, contentType, data (base64) } → { url }
// Uploads to the product-photos bucket with the service key (bypasses the
// per-user folder RLS, since admin uploads belong to the shared catalog).
uploadRouter.post('/', async (req, res) => {
  const { filename, contentType, data } = req.body ?? {};
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'data (base64) gerekli' });
  }
  if (!contentType || !ALLOWED.has(contentType)) {
    return res.status(400).json({ error: 'Desteklenmeyen görsel türü' });
  }

  const base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    return res.status(400).json({ error: 'Boş dosya' });
  }
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ error: 'Dosya 8MB sınırını aşıyor' });
  }

  const ext = extFor(contentType, filename);
  const path = `admin/${randomUUID()}${ext}`;

  try {
    const db = getServiceClient();
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw error;

    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path);
    res.json({ url: pub.publicUrl });
  } catch (err) {
    logger.error({ err: String(err) }, 'upload failed');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

function extFor(contentType: string, filename?: string): string {
  const fromName = typeof filename === 'string' ? filename.match(/\.[a-z0-9]+$/i)?.[0] : null;
  if (fromName) return fromName.toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[contentType] ?? '';
}
