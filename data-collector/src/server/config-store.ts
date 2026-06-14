import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SiteConfig } from '../scraper/types.js';

const CONFIGS_DIR = join(process.cwd(), 'configs');

function ensureDir(): void {
  if (!existsSync(CONFIGS_DIR)) {
    mkdirSync(CONFIGS_DIR, { recursive: true });
  }
}

export function loadAllConfigs(): SiteConfig[] {
  ensureDir();
  const files = readdirSync(CONFIGS_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const content = readFileSync(join(CONFIGS_DIR, f), 'utf-8');
    return JSON.parse(content) as SiteConfig;
  });
}

export function loadConfig(id: string): SiteConfig | null {
  ensureDir();
  const filepath = join(CONFIGS_DIR, `${id}.json`);
  if (!existsSync(filepath)) return null;
  const content = readFileSync(filepath, 'utf-8');
  return JSON.parse(content) as SiteConfig;
}

export function saveConfig(config: SiteConfig): void {
  ensureDir();
  const filepath = join(CONFIGS_DIR, `${config.id}.json`);
  writeFileSync(filepath, JSON.stringify(config, null, 2), 'utf-8');
}

export function deleteConfig(id: string): boolean {
  const filepath = join(CONFIGS_DIR, `${id}.json`);
  if (!existsSync(filepath)) return false;
  unlinkSync(filepath);
  return true;
}

export function configExists(id: string): boolean {
  return existsSync(join(CONFIGS_DIR, `${id}.json`));
}
