export interface BooleanFlags {
  is_cruelty_free: boolean;
  is_vegan: boolean;
  is_fragrance_free: boolean;
  is_paraben_free: boolean;
  is_alcohol_free: boolean;
}

const FLAG_PATTERNS: Array<{ key: keyof BooleanFlags; patterns: RegExp[] }> = [
  {
    key: 'is_cruelty_free',
    patterns: [/cruelty[\s-]?free/i, /leaping bunny/i, /not tested on animals/i],
  },
  {
    key: 'is_vegan',
    patterns: [/\bvegan\b/i, /100%\s*vegan/i, /plant[\s-]?based/i],
  },
  {
    key: 'is_fragrance_free',
    patterns: [/fragrance[\s-]?free/i, /unscented/i, /no (?:added )?fragrance/i],
  },
  {
    key: 'is_paraben_free',
    patterns: [/paraben[\s-]?free/i, /no parabens/i],
  },
  {
    key: 'is_alcohol_free',
    patterns: [/alcohol[\s-]?free/i, /no alcohol/i],
  },
];

/**
 * Detect boolean product claims from raw claims array and description.
 */
export function detectBooleanFlags(claims: string[], description: string): BooleanFlags {
  const text = [...claims, description].join(' ');

  const flags: BooleanFlags = {
    is_cruelty_free: false,
    is_vegan: false,
    is_fragrance_free: false,
    is_paraben_free: false,
    is_alcohol_free: false,
  };

  for (const { key, patterns } of FLAG_PATTERNS) {
    flags[key] = patterns.some((p) => p.test(text));
  }

  return flags;
}
