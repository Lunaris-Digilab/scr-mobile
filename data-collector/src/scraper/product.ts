import type { SiteConfig, ScrapedProduct } from './types.js';
import { extractWithPlaywright } from './strategies/playwright.js';
import { extractWithCheerio } from './strategies/cheerio.js';
import { logger } from '../utils/logger.js';

/**
 * Scrape a single product page and return raw ScrapedProduct data.
 */
export async function scrapeProduct(
  url: string,
  config: SiteConfig,
): Promise<ScrapedProduct> {
  logger.info({ url, site: config.id }, 'Scraping product page');

  const extract = config.strategy === 'playwright'
    ? extractWithPlaywright
    : extractWithCheerio;

  const raw = await extract(url, config);

  // Parse claims from JSON string (multiple elements)
  let claims: string[] = [];
  try {
    claims = raw.claims ? JSON.parse(raw.claims) : [];
  } catch {
    claims = raw.claims ? [raw.claims] : [];
  }

  const product: ScrapedProduct = {
    rawName: raw.name ?? '',
    rawBrand: raw.brand ?? '',
    rawDescription: raw.description ?? '',
    rawIngredients: raw.ingredients ?? '',
    rawImage: raw.image ?? '',
    rawSize: raw.size ?? '',
    rawHowToUse: raw.howToUse ?? '',
    rawClaims: claims,
    rawCategory: raw.category ?? '',
    rawSpf: raw.spf ?? '',
    rawShelfLife: raw.shelfLife ?? '',
    sourceUrl: url,
    scrapedAt: new Date().toISOString(),
    siteId: config.id,
  };

  logger.debug({ name: product.rawName, brand: product.rawBrand }, 'Product scraped');
  return product;
}
