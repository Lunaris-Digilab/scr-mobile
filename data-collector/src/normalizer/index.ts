import type { ScrapedProduct, NormalizedProduct } from '../scraper/types.js';
import { NormalizedProductSchema } from '../schema/product.js';
import { normalizeCategory } from './category.js';
import { normalizeTexture } from './texture.js';
import { parseIngredients } from './ingredients.js';
import { parseSize } from './size.js';
import { detectBooleanFlags } from './boolean-flags.js';
import { inferUsageTime, inferUsageFrequency, inferTargetArea } from './usage.js';
import { logger } from '../utils/logger.js';

/**
 * Normalize a raw ScrapedProduct into a NormalizedProduct matching the Glowist schema.
 * Returns null if validation fails.
 */
export function normalize(raw: ScrapedProduct): NormalizedProduct | null {
  try {
    const category = normalizeCategory(raw.rawCategory, raw.rawName);
    const texture = normalizeTexture(raw.rawName, raw.rawDescription);
    const size = parseSize(raw.rawSize);
    const ingredients = parseIngredients(raw.rawIngredients);
    const flags = detectBooleanFlags(raw.rawClaims, raw.rawDescription);
    const usageTime = inferUsageTime(raw.rawHowToUse, raw.rawName);
    const usageFrequency = inferUsageFrequency(raw.rawHowToUse);
    const targetArea = inferTargetArea(category, raw.rawName);

    // Parse SPF
    let spf: number | null = null;
    const spfMatch = `${raw.rawSpf} ${raw.rawName}`.match(/spf\s*(\d+)/i);
    if (spfMatch?.[1]) {
      const val = parseInt(spfMatch[1], 10);
      if (val >= 1 && val <= 100) spf = val;
    }

    // Parse shelf life (months)
    let shelfLifeMonths: number | null = null;
    const shelfMatch = raw.rawShelfLife.match(/(\d+)\s*m/i);
    if (shelfMatch?.[1]) {
      shelfLifeMonths = parseInt(shelfMatch[1], 10);
    }

    // Resolve image URL
    let imageUrl: string | null = raw.rawImage.trim() || null;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = null; // skip relative URLs without base
    }

    const product: NormalizedProduct = {
      name: raw.rawName.trim(),
      brand: raw.rawBrand.trim() || null,
      category,
      description: raw.rawDescription.trim() || null,
      ingredients_text: raw.rawIngredients.trim() || null,
      ingredients,
      image_url: imageUrl,
      barcode: null,

      size_value: size?.value ?? null,
      size_unit: size?.unit ?? null,
      usage_instructions: raw.rawHowToUse.trim() || null,
      usage_frequency: usageFrequency,
      usage_time: usageTime,
      texture,
      spf,
      ph_level: null,
      shelf_life_months: shelfLifeMonths,

      ...flags,

      country_of_origin: null,
      target_area: targetArea,

      _source_url: raw.sourceUrl,
      _scraped_at: raw.scrapedAt,
      _site_id: raw.siteId,
    };

    // Validate with Zod
    const result = NormalizedProductSchema.safeParse(product);
    if (!result.success) {
      logger.warn(
        { name: product.name, errors: result.error.flatten().fieldErrors },
        'Product failed Zod validation',
      );
      return null;
    }

    return product;
  } catch (err) {
    logger.error({ err: String(err), name: raw.rawName }, 'Normalization failed');
    return null;
  }
}
