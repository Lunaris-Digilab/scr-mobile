/**
 * Template for adding a new site config.
 *
 * 1. Copy this file and rename to your-site.ts
 * 2. Fill in the selectors by inspecting the target site
 * 3. Register in config/index.ts
 *
 * Tips:
 * - Use 'playwright' strategy for SPAs / JS-rendered sites
 * - Use 'cheerio' strategy for static/server-rendered HTML
 * - Use preActions to click "show more" buttons before extraction
 * - Use customExtractors for complex logic CSS selectors can't handle
 */

import type { SiteConfig } from '../../scraper/types.js';

export const rossmannDeConfig: SiteConfig = {
  id: 'rossmann-de',
  name: 'Rossmann',
  baseUrl: 'https://www.rossmann.de',
  strategy: 'playwright', // or 'cheerio'

  listing: {
    urlTemplate: 'https://www.rossmann.de/de/pflege-und-duft/gesichtspflege/c/olcat2_2?pageIndex={{page}}',
    productLinkSelector: '/html/body/main/div[2]/div/div[2]/div[2]/div[3]/div[1]/div[2]/div/div/div[1]/div[1]/div[2]/div[2]/a',
    maxPages: 5,
    maxProducts: 50,
  },

  selectors: {
    name: '.rm-product__title',
    brand: '.rm-product__brand',
    description: '#GRP_PRODUKTDETAILS',
    image: '.rm-product__image source',
    ingredients: '#GRP_INHALTSSTOFFE > div > div > p',
    size: 'body > div.rm-wrapper > div.rm-site > div > main > section > div > div:nth-child(2) > div.rm-grid__col--12.rm-grid__col-lg--4 > div > div:nth-child(2) > div.rm-grid__col.rm-grid__col-order-lg--1 > div.rm-product__units > strong:nth-child(1)',
    howToUse: '#GRP_ANWENDUNGGEBRAUCH > div > div > p',
    claims: '.product-badges span',
    spf: '', // leave empty if not applicable
    shelfLife: '',
    category: 'body > div.rm-wrapper > div.rm-site > div > main > div > ol > li:nth-child(2) > a',
  },

  preActions: [
    // { type: 'click', selector: 'button.show-ingredients' },
    // { type: 'wait', timeout: 1000 },
  ],

  rateLimit: { concurrency: 1, delayMs: 2000 },
};
