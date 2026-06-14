import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sitesRouter } from './routes/sites.js';
import { scrapeRouter } from './routes/scrape.js';
import { testRouter } from './routes/test.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { taxonomyRouter } from './routes/taxonomy.js';
import { uploadRouter } from './routes/upload.js';
import { requireAdmin } from './middleware/require-admin.js';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startServer(port = 3456): void {
  // Surface missing config early instead of failing on first login/API call.
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY'] as const) {
    if (!process.env[key]) logger.warn(`${key} is not set in .env — admin dashboard will not work until it is`);
  }

  const app = express();

  // Larger limit so base64 image uploads fit in the JSON body.
  app.use(express.json({ limit: '15mb' }));

  // Serve GUI static files
  app.use(express.static(join(__dirname, '../gui')));

  // ── Public auth (login). /me self-guards via requireAdmin inside the router. ──
  app.use('/api/auth', authRouter);

  // ── Admin-only product management ──
  app.use('/api/products', requireAdmin, productsRouter);
  app.use('/api/upload', requireAdmin, uploadRouter);

  // ── Admin-only scraper (secondary) ──
  app.use('/api/sites', requireAdmin, sitesRouter);
  app.use('/api/scrape', requireAdmin, scrapeRouter);

  // ── Admin-only lookups + selector tester (one auth pass for both) ──
  app.use('/api', requireAdmin, testRouter, taxonomyRouter);

  // SPA fallback — serve index.html for non-API routes
  app.get('/{*path}', (_req, res) => {
    res.sendFile(join(__dirname, '../gui/index.html'));
  });

  app.listen(port, () => {
    logger.info(`Admin dashboard running at http://localhost:${port}`);
  });
}
