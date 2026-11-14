// Mode B: container recipes in → grams per container and thaw totals out.
import type { Product } from './types';

export type RecipeInput = {
  items: { product: Product; share: number }[];
  /** 'kcal': shares are calorie shares. 'weight': shares are gram shares. */
  basis: 'kcal' | 'weight';
  count: number;
};

export type Portion = { product: Product; grams: number; kcal: number };
export type PlannedRecipe = { portions: Portion[]; meatKcal: number; count: number };

const kcalOf = (p: Product, grams: number) => (grams * p.kcalPer100g) / 100;

/**
 * Whole grams for each portion, choosing floor or ceil per portion so the
 * container's kcal lands as close to `targetKcal` as possible (ties: the choice
 * closest to the exact grams).
 */
export function roundPortions(raw: { product: Product; grams: number }[], targetKcal: number): Portion[] {
  let best: { grams: number[]; err: number; dev: number } | null = null;
  for (let mask = 0; mask < 1 << raw.length; mask++) {
    const grams = raw.map((r, i) => Math.max(0, (mask >> i) & 1 ? Math.ceil(r.grams) : Math.floor(r.grams)));
    const err = Math.abs(grams.reduce((s, g, i) => s + kcalOf(raw[i]!.product, g), 0) - targetKcal);
    const dev = grams.reduce((s, g, i) => s + (g - raw[i]!.grams) ** 2, 0);
    if (!best || err < best.err - 1e-9 || (Math.abs(err - best.err) <= 1e-9 && dev < best.dev)) best = { grams, err, dev };
  }
  return raw.map((r, i) => ({ product: r.product, grams: best!.grams[i]!, kcal: kcalOf(r.product, best!.grams[i]!) }));
}

export function planRecipe(recipe: RecipeInput, meatKcal: number): PlannedRecipe {
  const total = recipe.items.reduce((s, i) => s + i.share, 0);
  const items = recipe.items.map((i) => ({ product: i.product, frac: total > 0 ? i.share / total : 0 }));
  let rawGrams: number[];
  if (recipe.basis === 'kcal') {
    rawGrams = items.map((i) => ((meatKcal * i.frac) / i.product.kcalPer100g) * 100);
  } else {
    const kcalPerGramOfBlend = items.reduce((s, i) => s + (i.frac * i.product.kcalPer100g) / 100, 0);
    const blendGrams = kcalPerGramOfBlend > 0 ? meatKcal / kcalPerGramOfBlend : 0;
    rawGrams = items.map((i) => blendGrams * i.frac);
  }
  const portions = roundPortions(items.map((i, idx) => ({ product: i.product, grams: rawGrams[idx]! })), meatKcal);
  return { portions, meatKcal: portions.reduce((s, p) => s + p.kcal, 0), count: recipe.count };
}

export type ThawLine = {
  product: Product;
  grams: number;
  fullPacks: number;
  packsToOpen: number;
  leftoverGrams: number;
};

export function thawTotals(recipes: { portions: { product: Product; grams: number }[]; count: number }[]): ThawLine[] {
  const byId = new Map<string, { product: Product; grams: number }>();
  for (const r of recipes) {
    for (const p of r.portions) {
      const cur = byId.get(p.product.id) ?? { product: p.product, grams: 0 };
      cur.grams += p.grams * r.count;
      byId.set(p.product.id, cur);
    }
  }
  return [...byId.values()].map(({ product, grams }) => {
      const unit = product.package.unitGrams;
      const packsToOpen = Math.ceil(grams / unit - 1e-9);
      return { product, grams, fullPacks: Math.floor(grams / unit + 1e-9), packsToOpen, leftoverGrams: packsToOpen * unit - grams };
    });
}
