import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { ScrapeResult } from '../scraper/types.js';
import { logger } from '../utils/logger.js';

const OUTPUT_DIR = join(process.cwd(), 'output');

/**
 * Write scrape results to a JSON file.
 */
export function writeJson(result: ScrapeResult): string {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${result.siteId}_${timestamp}.json`;
  const filepath = join(OUTPUT_DIR, filename);

  const output = {
    site: result.siteId,
    scrapedAt: new Date().toISOString(),
    stats: result.stats,
    products: result.products,
    errors: result.errors,
  };

  writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');
  logger.info({ filepath, count: result.products.length }, 'Wrote JSON output');

  return filepath;
}
