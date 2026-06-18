import type { SiteConfig, ScrapeResult, NormalizedProduct } from './types.js';
import { discoverProductUrls } from './listing.js';
import { scrapeProduct } from './product.js';
import { normalize } from '../normalizer/index.js';
import { dedup } from '../utils/dedup.js';
import { createRateLimiter } from '../utils/rate-limiter.js';
import { withRetry } from '../utils/retry.js';
import { writeJson } from '../output/json-writer.js';
import { writeToSupabase } from '../output/supabase-writer.js';
import { closeBrowser } from './strategies/playwright.js';
import { logger } from '../utils/logger.js';

export interface ScrapeOptions {
  maxProducts?: number;
  output?: 'json' | 'supabase' | 'both';
  dryRun?: boolean;
}

/**
 * Full scrape pipeline: discover → scrape → normalize → output.
 */
export async function runScrape(config: SiteConfig, options: ScrapeOptions): Promise<ScrapeResult> {
  const start = Date.now();
  const errors: Array<{ url: string; error: string }> = [];
  const products: NormalizedProduct[] = [];

  try {
    // Stage 1: Discover URLs
    logger.info({ site: config.id }, 'Starting URL discovery...');
    const urls = await discoverProductUrls(config, options.maxProducts);

    if (urls.length === 0) {
      logger.warn({ site: config.id }, 'No product URLs found');
      return buildResult(config.id, [], errors, urls.length, start);
    }

    // Stage 2+3: Scrape + Normalize each product
    const queue = createRateLimiter(config.rateLimit);

    const scrapePromises = urls.map((url) =>
      queue.add(async () => {
        try {
          const raw = await withRetry(() => scrapeProduct(url, config), url);
          const normalized = normalize(raw);

          if (normalized) {
            products.push(normalized);
          } else {
            errors.push({ url, error: 'Normalization failed or validation error' });
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push({ url, error: message });
          logger.error({ url, err: message }, 'Failed to scrape product');
        }
      })
    );

    await Promise.all(scrapePromises);

    // Dedup
    const dedupedProducts = dedup(products);
    const result = buildResult(config.id, dedupedProducts, errors, urls.length, start);

    // Stage 4: Output
    if (options.dryRun) {
      logger.info({ stats: result.stats }, 'Dry run complete — no output written');
      for (const p of dedupedProducts.slice(0, 5)) {
        logger.info({ name: p.name, brand: p.brand, category: p.category }, 'Sample product');
      }
    } else {
      const writeSupabase = options.output === 'supabase' || options.output === 'both';
      const writeJsonFile = options.output === 'json' || options.output === 'both' || !options.output;

      if (writeJsonFile) {
        writeJson(result);
      }

      if (writeSupabase) {
        logger.info('Writing to Supabase...');
        for (const p of dedupedProducts) {
          try {
            await writeToSupabase(p);
          } catch (err) {
            logger.error({ name: p.name, err: String(err) }, 'Failed to write to Supabase');
          }
        }
        logger.info({ count: dedupedProducts.length }, 'Supabase write complete');
      }
    }

    // Summary
    logger.info(
      {
        site: config.id,
        discovered: result.stats.urlsDiscovered,
        scraped: result.stats.scraped,
        normalized: result.stats.normalized,
        failed: result.stats.failed,
        duration: `${(result.stats.durationMs / 1000).toFixed(1)}s`,
      },
      'Scrape complete',
    );

    return result;
  } finally {
    if (config.strategy === 'playwright') {
      await closeBrowser();
    }
  }
}

/**
 * Scrape a single URL (for scrape-url command).
 */
export async function scrapeSingleUrl(
  url: string,
  config: SiteConfig,
  options: ScrapeOptions,
): Promise<ScrapeResult> {
  const start = Date.now();
  const errors: Array<{ url: string; error: string }> = [];
  const products: NormalizedProduct[] = [];

  try {
    const raw = await scrapeProduct(url, config);
    const normalized = normalize(raw);

    if (normalized) {
      products.push(normalized);
    } else {
      errors.push({ url, error: 'Normalization failed' });
    }

    const result = buildResult(config.id, products, errors, 1, start);

    if (options.dryRun) {
      logger.info({ product: products[0] }, 'Dry run — single product');
    } else {
      const writeSupabase = options.output === 'supabase' || options.output === 'both';
      const writeJsonFile = options.output === 'json' || options.output === 'both' || !options.output;

      if (writeJsonFile) writeJson(result);
      if (writeSupabase && products[0]) await writeToSupabase(products[0]);
    }

    return result;
  } finally {
    if (config.strategy === 'playwright') {
      await closeBrowser();
    }
  }
}

function buildResult(
  siteId: string,
  products: NormalizedProduct[],
  errors: Array<{ url: string; error: string }>,
  urlsDiscovered: number,
  startTime: number,
): ScrapeResult {
  return {
    siteId,
    products,
    errors,
    stats: {
      urlsDiscovered,
      scraped: products.length + errors.length,
      normalized: products.length,
      failed: errors.length,
      durationMs: Date.now() - startTime,
    },
  };
}
