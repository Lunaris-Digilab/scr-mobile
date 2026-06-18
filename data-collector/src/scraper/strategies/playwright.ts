import { chromium, type Browser, type Page } from 'playwright';
import type { SiteConfig, PreAction } from '../types.js';
import { logger } from '../../utils/logger.js';

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    logger.info('Launching Playwright browser...');
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export async function extractWithPlaywright(
  url: string,
  config: SiteConfig,
): Promise<Record<string, string>> {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Execute pre-actions (click "show ingredients", scroll, etc.)
    if (config.preActions) {
      await executePreActions(page, config.preActions);
    }

    const data: Record<string, string> = {};

    for (const [field, selector] of Object.entries(config.selectors)) {
      if (!selector) {
        data[field] = '';
        continue;
      }
      try {
        if (field === 'image') {
          data[field] = await extractImageSrc(page, selector);
        } else if (field === 'claims') {
          data[field] = await extractMultipleTexts(page, selector);
        } else {
          const el = await page.$(selector);
          data[field] = el ? (await el.textContent() ?? '').trim() : '';
        }
      } catch {
        data[field] = '';
      }
    }

    // Run custom extractors
    if (config.customExtractors) {
      for (const [field, extractor] of Object.entries(config.customExtractors)) {
        try {
          data[field] = await extractor(page);
        } catch {
          data[field] = '';
        }
      }
    }

    return data;
  } finally {
    await page.close();
  }
}

export async function extractLinksWithPlaywright(
  url: string,
  selector: string,
  baseUrl: string,
): Promise<string[]> {
  const b = await getBrowser();
  const page = await b.newPage();
  const isXPath = selector.startsWith('/') || selector.startsWith('(');

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const locator = isXPath
      ? page.locator(`xpath=${selector}`)
      : page.locator(selector);

    await locator.first().waitFor({ timeout: 10_000 }).catch(() => null);

    const elements = await locator.all();
    const links: string[] = [];

    for (const el of elements) {
      const href = await el.getAttribute('href');
      if (!href) continue;
      try {
        links.push(new URL(href, baseUrl).href);
      } catch {
        // invalid URL, skip
      }
    }

    return [...new Set(links)];
  } finally {
    await page.close();
  }
}

async function executePreActions(page: Page, actions: PreAction[]): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'click':
          if (action.selector) {
            await page.click(action.selector, { timeout: action.timeout ?? 5000 });
            await page.waitForTimeout(500);
          }
          break;
        case 'scroll':
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(action.timeout ?? 1000);
          break;
        case 'wait':
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: action.timeout ?? 10_000 });
          } else {
            await page.waitForTimeout(action.timeout ?? 2000);
          }
          break;
      }
    } catch (err) {
      logger.debug({ action, err: String(err) }, 'Pre-action failed (non-fatal)');
    }
  }
}

async function extractImageSrc(page: Page, selector: string): Promise<string> {
  const el = await page.$(selector);
  if (!el) return '';
  const src = await el.getAttribute('src')
    ?? await el.getAttribute('data-src')
    ?? await el.getAttribute('srcset')
    ?? '';
  return src.split(',')[0]?.trim().split(' ')[0] ?? '';
}

async function extractMultipleTexts(page: Page, selector: string): Promise<string> {
  const texts = await page.$$eval(selector, (els) =>
    els.map((el) => (el.textContent ?? '').trim()).filter(Boolean)
  );
  return JSON.stringify(texts);
}
