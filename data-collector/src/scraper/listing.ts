import type { SiteConfig } from './types.js';
import { extractLinksWithPlaywright } from './strategies/playwright.js';
import { extractLinksWithCheerio } from './strategies/cheerio.js';
import { logger } from '../utils/logger.js';

/**
 * Crawl listing pages and collect product URLs.
 */
export async function discoverProductUrls(
  config: SiteConfig,
  maxProducts?: number,
): Promise<string[]> {
  const allUrls: string[] = [];
  const maxPages = config.listing.maxPages ?? 10;
  const limit = maxProducts ?? config.listing.maxProducts ?? 200;

  const extractLinks = config.strategy === 'playwright'
    ? extractLinksWithPlaywright
    : extractLinksWithCheerio;

  for (let page = 1; page <= maxPages; page++) {
    const url = config.listing.urlTemplate.replace('{{page}}', String(page));
    logger.info({ page, url }, 'Crawling listing page');

    try {
      const links = await extractLinks(url, config.listing.productLinkSelector, config.baseUrl);

      if (links.length === 0) {
        logger.info({ page }, 'No more products found, stopping pagination');
        break;
      }

      allUrls.push(...links);
      logger.info({ page, found: links.length, total: allUrls.length }, 'Collected product URLs');

      if (allUrls.length >= limit) {
        break;
      }
    } catch (err) {
      logger.error({ page, url, err: String(err) }, 'Failed to crawl listing page');
      break;
    }
  }

  const unique = [...new Set(allUrls)].slice(0, limit);
  logger.info({ total: unique.length }, 'Total unique product URLs discovered');
  return unique;
}
