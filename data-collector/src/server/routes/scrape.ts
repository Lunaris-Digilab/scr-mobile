import { Router } from 'express';
import { getSiteConfig } from '../../config/index.js';
import { runScrape, scrapeSingleUrl } from '../../scraper/engine.js';
import { logger } from '../../utils/logger.js';
import type { ScrapeResult } from '../../scraper/types.js';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const scrapeRouter = Router();

// Active scrape state for SSE
let activeScrape: {
  running: boolean;
  siteId: string;
  progress: string;
  result: ScrapeResult | null;
} = { running: false, siteId: '', progress: '', result: null };

const sseClients: Set<any> = new Set();

function broadcast(data: object): void {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    res.write(msg);
  }
}

// GET /api/scrape/status — SSE stream
scrapeRouter.get('/status', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  // Send current state
  res.write(`data: ${JSON.stringify({ type: 'state', ...activeScrape })}\n\n`);

  req.on('close', () => sseClients.delete(res));
});

// POST /api/scrape — Start scrape
scrapeRouter.post('/', async (req, res) => {
  const { siteId, maxProducts, output } = req.body;

  if (activeScrape.running) {
    return res.status(409).json({ error: 'A scrape is already running' });
  }

  const config = getSiteConfig(siteId);
  if (!config) return res.status(404).json({ error: 'Site not found' });

  activeScrape = { running: true, siteId, progress: 'Starting...', result: null };
  broadcast({ type: 'started', siteId });

  res.json({ message: 'Scrape started', siteId });

  // Run in background
  try {
    // Override logger to broadcast progress
    const origInfo = logger.info.bind(logger);

    const result = await runScrape(config, {
      maxProducts: maxProducts ?? config.listing.maxProducts,
      output: output ?? 'json',
      dryRun: false,
    });

    activeScrape = { running: false, siteId, progress: 'Complete', result };
    broadcast({ type: 'complete', siteId, stats: result.stats });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    activeScrape = { running: false, siteId, progress: `Error: ${msg}`, result: null };
    broadcast({ type: 'error', siteId, error: msg });
  }
});

// POST /api/scrape-url — Scrape single URL
scrapeRouter.post('/url', async (req, res) => {
  const { url, siteId } = req.body;

  const config = getSiteConfig(siteId);
  if (!config) return res.status(404).json({ error: 'Site not found' });

  try {
    const result = await scrapeSingleUrl(url, config, { output: 'json', dryRun: false });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/results — List result files
scrapeRouter.get('/results', (_req, res) => {
  const dir = join(process.cwd(), 'output');
  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
    const results = files.map((f) => {
      try {
        const content = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
        return {
          filename: f,
          site: content.site,
          scrapedAt: content.scrapedAt,
          productCount: content.products?.length ?? 0,
          errorCount: content.errors?.length ?? 0,
        };
      } catch {
        return { filename: f, site: 'unknown', scrapedAt: '', productCount: 0, errorCount: 0 };
      }
    });
    res.json(results);
  } catch {
    res.json([]);
  }
});

// GET /api/results/:filename — Get specific result
scrapeRouter.get('/results/:filename', (req, res) => {
  const filepath = join(process.cwd(), 'output', req.params.filename);
  try {
    const content = readFileSync(filepath, 'utf-8');
    res.json(JSON.parse(content));
  } catch {
    res.status(404).json({ error: 'Result file not found' });
  }
});
