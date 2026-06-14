#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { getSiteConfig, getAllSiteConfigs } from './config/index.js';
import { runScrape, scrapeSingleUrl } from './scraper/engine.js';
import { NormalizedProductSchema } from './schema/product.js';
import { startServer } from './server/index.js';
import { logger } from './utils/logger.js';

// Load .env manually (no dotenv dependency)
try {
  const envPath = new URL('../.env', import.meta.url).pathname;
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {
  // .env file not found — that's ok for JSON-only mode
}

const program = new Command();

program
  .name('glowist-data-collector')
  .description('Web scraping tool for Glowist skincare product database')
  .version('1.0.0');

// ── server command ──
program
  .command('server')
  .description('Start the GUI dashboard')
  .option('-p, --port <port>', 'Port number', parseInt, 3456)
  .action((opts) => {
    startServer(opts.port);
  });

// ── sites command ──
program
  .command('sites')
  .description('List all registered site configs')
  .action(() => {
    const configs = getAllSiteConfigs();
    console.log('\nRegistered sites:\n');
    for (const config of configs) {
      console.log(`  ${config.id.padEnd(20)} ${config.name.padEnd(25)} [${config.strategy}]`);
    }
    console.log(`\nTotal: ${configs.length} site(s)\n`);
  });

// ── scrape command ──
program
  .command('scrape')
  .description('Scrape products from a registered site')
  .requiredOption('-s, --site <id>', 'Site ID (use "sites" command to list)')
  .option('-m, --max-products <n>', 'Max products to scrape', parseInt)
  .option('-o, --output <type>', 'Output type: json (default) or supabase', 'json')
  .option('--dry-run', 'Scrape and normalize but don\'t save output')
  .action(async (opts) => {
    const config = getSiteConfig(opts.site);
    if (!config) {
      logger.error({ site: opts.site }, 'Unknown site. Use "sites" command to list available sites.');
      process.exit(1);
    }

    try {
      await runScrape(config, {
        maxProducts: opts.maxProducts,
        output: opts.output,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      logger.error({ err: String(err) }, 'Scrape failed');
      process.exit(1);
    }
  });

// ── scrape-url command ──
program
  .command('scrape-url <url>')
  .description('Scrape a single product URL')
  .requiredOption('-s, --site <id>', 'Site config to use for selectors')
  .option('-o, --output <type>', 'Output type: json (default) or supabase', 'json')
  .option('--dry-run', 'Scrape and normalize but don\'t save output')
  .action(async (url, opts) => {
    const config = getSiteConfig(opts.site);
    if (!config) {
      logger.error({ site: opts.site }, 'Unknown site.');
      process.exit(1);
    }

    try {
      await scrapeSingleUrl(url, config, {
        output: opts.output,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      logger.error({ err: String(err) }, 'Scrape-url failed');
      process.exit(1);
    }
  });

// ── validate command ──
program
  .command('validate <file>')
  .description('Validate a JSON output file against the Glowist schema')
  .action((file) => {
    try {
      const content = readFileSync(file, 'utf-8');
      const data = JSON.parse(content);
      const products = data.products ?? data;
      const arr = Array.isArray(products) ? products : [products];

      let valid = 0;
      let invalid = 0;

      for (const p of arr) {
        const result = NormalizedProductSchema.safeParse(p);
        if (result.success) {
          valid++;
        } else {
          invalid++;
          console.log(`\n  INVALID: ${p.name ?? 'unknown'}`);
          for (const [field, errs] of Object.entries(result.error.flatten().fieldErrors)) {
            console.log(`    ${field}: ${(errs as string[]).join(', ')}`);
          }
        }
      }

      console.log(`\nValidation: ${valid} valid, ${invalid} invalid out of ${arr.length} products\n`);
      if (invalid > 0) process.exit(1);
    } catch (err) {
      logger.error({ file, err: String(err) }, 'Failed to validate file');
      process.exit(1);
    }
  });

program.parse();
