import type { UsageTime, UsageFrequency, TargetArea, ProductCategory } from '../scraper/types.js';

/**
 * Infer usage_time from how-to-use text.
 */
export function inferUsageTime(howToUse: string, name: string): UsageTime | null {
  const text = `${howToUse} ${name}`.toLowerCase();

  const am = /\b(morning|am\b|day\s*time|daytime)/i.test(text);
  const pm = /\b(evening|pm\b|night|before bed|overnight)/i.test(text);

  if (am && pm) return 'both';
  if (am) return 'AM';
  if (pm) return 'PM';
  return null;
}

/**
 * Infer usage_frequency from how-to-use text.
 */
export function inferUsageFrequency(howToUse: string): UsageFrequency | null {
  const text = howToUse.toLowerCase();

  if (/twice\s*(a\s*)?daily|morning\s*and\s*(evening|night)|am\s*(&|and)\s*pm/i.test(text)) return 'twice_daily';
  if (/once\s*(a\s*)?week|weekly|1-2\s*times?\s*(?:a\s*)?week/i.test(text)) return 'weekly';
  if (/as\s*needed|when\s*needed|occasional/i.test(text)) return 'as_needed';
  if (/daily|every\s*day|each\s*(morning|evening|night)/i.test(text)) return 'daily';
  return null;
}

/**
 * Infer target_area from product category and name.
 */
export function inferTargetArea(category: ProductCategory | null, name: string): TargetArea | null {
  const text = name.toLowerCase();

  if (/\beye\b|under[\s-]eye/i.test(text) || category === 'eye_cream') return 'eye';
  if (/\blip\b/i.test(text)) return 'lip';
  if (/\bbody\b|body\s*(lotion|cream|oil)/i.test(text)) return 'body';
  if (/\bhand\b|hand\s*cream/i.test(text)) return 'hand';
  if (/\bhair\b|scalp/i.test(text)) return 'hair';
  if (/\bnail\b/i.test(text)) return 'nail';

  // Default: most skincare products target the face
  if (category && ['cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask', 'treatment'].includes(category)) {
    return 'face';
  }

  return null;
}
