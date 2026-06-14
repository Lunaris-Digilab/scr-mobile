import type { SiteConfig } from '../../scraper/types.js';

export const theOrdinaryConfig: SiteConfig = {
  id: 'the-ordinary',
  name: 'The Ordinary',
  baseUrl: 'https://theordinary.com',
  strategy: 'playwright',

  listing: {
    urlTemplate: 'https://theordinary.com/en-tr/skincare.html?page={{page}}',
    productLinkSelector: 'a[href*="/en-tr/"][href$=".html"][class*="product"], .product-tile a, a[data-testid="product-link"], .product-card a[href*=".html"]',
    maxPages: 5,
    maxProducts: 100,
  },

  selectors: {
    name: 'h1.product-name, h1[data-testid="product-name"], .product-detail h1',
    brand: '.product-brand, [data-testid="product-brand"]',
    description: '.product-description, [data-testid="product-description"], .product-info__description',
    image: '.product-image img, .product-hero img, [data-testid="product-image"] img',
    ingredients: '.ingredient-list, [data-testid="ingredients"], .product-ingredients',
    size: '.product-size, [data-testid="product-size"], .product-price__size',
    howToUse: '.how-to-use, [data-testid="how-to-use"], .product-directions',
    claims: '.product-claims span, .product-badges span, [data-testid="product-claim"]',
    spf: '.product-spf, [data-testid="spf"]',
    shelfLife: '.product-pao, [data-testid="pao"]',
    category: 'nav.breadcrumb, .breadcrumbs, [data-testid="breadcrumb"]',
  },

  preActions: [
    { type: 'wait', timeout: 2000 },
    { type: 'click', selector: 'button[data-testid="show-ingredients"], .ingredients-toggle, button:has-text("Ingredients")' },
    { type: 'wait', timeout: 1000 },
  ],

  rateLimit: { concurrency: 1, delayMs: 2500 },
};
