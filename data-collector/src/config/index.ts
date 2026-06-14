import type { SiteConfig } from '../scraper/types.js';
import { loadAllConfigs, loadConfig } from '../server/config-store.js';

export function getSiteConfig(siteId: string): SiteConfig | undefined {
  return loadConfig(siteId) ?? undefined;
}

export function getAllSiteConfigs(): SiteConfig[] {
  return loadAllConfigs();
}

export function listSiteIds(): string[] {
  return loadAllConfigs().map((c) => c.id);
}
