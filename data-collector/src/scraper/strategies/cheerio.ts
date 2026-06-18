import * as cheerio from 'cheerio';
import type { SiteConfig } from '../types.js';
import { logger } from '../../utils/logger.js';

export async function extractWithCheerio(
  url: string,
  config: SiteConfig,
): Promise<Record<string, string>> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const data: Record<string, string> = {};

  for (const [field, selector] of Object.entries(config.selectors)) {
    if (!selector) {
      data[field] = '';
      continue;
    }
    try {
      if (field === 'image') {
        const el = $(selector).first();
        data[field] = el.attr('src') ?? el.attr('data-src') ?? '';
      } else if (field === 'claims') {
        const texts = $(selector).map((_, el) => $(el).text().trim()).get().filter(Boolean);
        data[field] = JSON.stringify(texts);
      } else {
        data[field] = $(selector).first().text().trim();
      }
    } catch {
      data[field] = '';
    }
  }

  return data;
}

export async function extractLinksWithCheerio(
  url: string,
  selector: string,
  baseUrl: string,
): Promise<string[]> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const links: string[] = [];
  $(selector).each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        links.push(new URL(href, baseUrl).href);
      } catch {
        // ignore invalid URLs
      }
    }
  });

  return [...new Set(links)];
}

async function fetchHtml(url: string): Promise<string> {
  logger.debug({ url }, 'Fetching HTML');
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  return res.text();
}
