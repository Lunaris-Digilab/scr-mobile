import type { SizeUnit } from '../scraper/types.js';

interface ParsedSize {
  value: number;
  unit: SizeUnit;
}

const SIZE_PATTERNS: Array<{ regex: RegExp; unit: SizeUnit }> = [
  { regex: /([\d.]+)\s*fl\.?\s*oz/i, unit: 'fl_oz' },
  { regex: /([\d.]+)\s*oz/i, unit: 'oz' },
  { regex: /([\d.]+)\s*ml/i, unit: 'ml' },
  { regex: /([\d.]+)\s*g(?:ram)?s?(?:\b|$)/i, unit: 'g' },
  { regex: /([\d.]+)\s*(?:pcs|pieces?|count|pads?|sheets?|patches?)/i, unit: 'pcs' },
];

/**
 * Parse raw size string (e.g. "50 ml", "1.7 fl oz", "100 Pads") into value + unit.
 */
export function parseSize(raw: string): ParsedSize | null {
  if (!raw) return null;

  for (const { regex, unit } of SIZE_PATTERNS) {
    const match = raw.match(regex);
    if (match?.[1]) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        return { value, unit };
      }
    }
  }

  return null;
}
