import { Router } from 'express';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export const testRouter = Router();

// POST /api/test-selector — Test a CSS/XPath selector on a URL
testRouter.post('/test-selector', async (req, res) => {
  const { url, selector, strategy } = req.body;

  if (!url || !selector) {
    return res.status(400).json({ error: 'url and selector are required' });
  }

  try {
    if (strategy === 'cheerio') {
      const result = await testWithCheerio(url, selector);
      return res.json(result);
    }
    const result = await testWithPlaywright(url, selector);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

async function testWithPlaywright(url: string, selector: string): Promise<{ count: number; texts: string[] }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    const isXPath = selector.startsWith('/') || selector.startsWith('(');
    const locator = isXPath ? page.locator(`xpath=${selector}`) : page.locator(selector);

    const count = await locator.count();
    const texts: string[] = [];

    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await locator.nth(i).textContent();
      if (text?.trim()) texts.push(text.trim().substring(0, 200));
    }

    return { count, texts };
  } finally {
    await browser.close();
  }
}

async function testWithCheerio(url: string, selector: string): Promise<{ count: number; texts: string[] }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  const html = await response.text();
  const $ = cheerio.load(html);

  const elements = $(selector);
  const texts: string[] = [];
  elements.each((i, el) => {
    if (i >= 10) return false;
    const text = $(el).text().trim();
    if (text) texts.push(text.substring(0, 200));
  });

  return { count: elements.length, texts };
}
