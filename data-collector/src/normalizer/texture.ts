import type { ProductTexture } from '../scraper/types.js';

const TEXTURE_KEYWORDS: Array<[ProductTexture, string[]]> = [
  ['cream', ['cream', 'creme', 'crème']],
  ['gel', ['gel', 'gel-cream', 'jelly']],
  ['liquid', ['liquid', 'water', 'solution', 'tonic']],
  ['foam', ['foam', 'foaming', 'mousse']],
  ['oil', ['oil', 'facial oil', 'cleansing oil']],
  ['balm', ['balm', 'baume']],
  ['serum', ['serum', 'essence', 'ampoule']],
  ['mist', ['mist', 'spray toner', 'face mist']],
  ['paste', ['paste', 'clay']],
  ['powder', ['powder', 'enzyme powder']],
  ['lotion', ['lotion', 'emulsion', 'fluid']],
  ['spray', ['spray', 'aerosol']],
  ['stick', ['stick', 'balm stick']],
  ['patch', ['patch', 'pimple patch', 'dot']],
];

/**
 * Infer ProductTexture from product name + description.
 */
export function normalizeTexture(rawName: string, rawDescription: string): ProductTexture | null {
  const combined = `${rawName} ${rawDescription}`.toLowerCase();

  for (const [texture, keywords] of TEXTURE_KEYWORDS) {
    for (const keyword of keywords) {
      if (combined.includes(keyword)) {
        return texture;
      }
    }
  }

  return null;
}
