/**
 * Parse raw INCI ingredients text into individual ingredient names.
 * Handles parenthetical sub-ingredients and "May Contain" sections.
 */
export function parseIngredients(rawText: string): string[] {
  if (!rawText || rawText.trim().length === 0) return [];

  // Remove "May Contain" section
  let text = rawText.replace(/may contain[:\s].*/i, '').trim();

  // Remove trailing period
  text = text.replace(/\.\s*$/, '');

  // Split by commas, but respect parentheses
  const ingredients: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of text) {
    if (char === '(' || char === '[') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']') {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === ',' && depth === 0) {
      const trimmed = current.trim();
      if (trimmed) ingredients.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }

  const lastTrimmed = current.trim();
  if (lastTrimmed) ingredients.push(lastTrimmed);

  // Clean each ingredient
  return ingredients
    .map((i) => i.replace(/^\d+[\.\)]\s*/, '').trim()) // remove numbering
    .filter((i) => i.length > 0 && i.length < 200); // sanity check
}
