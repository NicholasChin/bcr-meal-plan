import { describe, expect, test } from 'vitest';
import { planRecipe, thawTotals } from './recipes';
import { KANGAROO, PORK, RABBIT } from './testProducts';

describe('planRecipe', () => {
  test('calorie shares: 60/40 of 130 kcal', () => {
    const r = planRecipe({ items: [{ product: KANGAROO, share: 60 }, { product: PORK, share: 40 }], basis: 'kcal', count: 4 }, 130);
    expect(r.portions[0]!.grams).toBe(Math.round((78 / 127) * 100)); // 61 g
    expect(r.portions[1]!.grams).toBe(Math.round((52 / 220) * 100)); // 24 g
  });

  test('weight shares: equal grams that add up to the kcal target', () => {
    const r = planRecipe({ items: [{ product: KANGAROO, share: 1 }, { product: PORK, share: 1 }], basis: 'weight', count: 1 }, 130);
    const [a, b] = r.portions.map((p) => p.grams);
    expect(Math.abs(a! - b!)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.meatKcal - 130)).toBeLessThan(2);
  });

  test('reports kcal from the rounded grams the owner will weigh', () => {
    const r = planRecipe({ items: [{ product: KANGAROO, share: 50 }, { product: PORK, share: 50 }], basis: 'kcal', count: 1 }, 130);
    expect(r.portions[0]!.kcal).toBeCloseTo((r.portions[0]!.grams * 127) / 100, 9);
    expect(r.meatKcal).toBeCloseTo(r.portions[0]!.kcal + r.portions[1]!.kcal, 9);
  });

  test('rounds grams so the container lands as close to the kcal target as possible', () => {
    // Naive rounding gives 130 ± 1.45 kcal here; choosing floor/ceil per portion gets within 0.02.
    const r = planRecipe({ items: [{ product: RABBIT, share: 60 }, { product: PORK, share: 40 }], basis: 'kcal', count: 1 }, 130);
    expect(Math.abs(r.meatKcal - 130)).toBeLessThan(0.05);
  });

  test('thaw totals keep the order products first appear in', () => {
    const a = planRecipe({ items: [{ product: RABBIT, share: 50 }, { product: KANGAROO, share: 50 }], basis: 'kcal', count: 1 }, 130);
    expect(thawTotals([a]).map((x) => x.product.id)).toEqual([RABBIT.id, KANGAROO.id]);
  });

  test('shares need not sum to 100', () => {
    const a = planRecipe({ items: [{ product: KANGAROO, share: 3 }, { product: PORK, share: 2 }], basis: 'kcal', count: 1 }, 130);
    const b = planRecipe({ items: [{ product: KANGAROO, share: 60 }, { product: PORK, share: 40 }], basis: 'kcal', count: 1 }, 130);
    expect(a.portions.map((p) => p.grams)).toEqual(b.portions.map((p) => p.grams));
  });
});

describe('thawTotals', () => {
  test('sums grams across recipes and counts packs to open', () => {
    const a = planRecipe({ items: [{ product: KANGAROO, share: 50 }, { product: PORK, share: 50 }], basis: 'kcal', count: 4 }, 130);
    const b = planRecipe({ items: [{ product: RABBIT, share: 50 }, { product: PORK, share: 50 }], basis: 'kcal', count: 6 }, 130);
    const t = thawTotals([a, b]);
    const pork = t.find((x) => x.product.id === PORK.id)!;
    expect(pork.grams).toBe(a.portions[1]!.grams * 4 + b.portions[1]!.grams * 6);
    expect(pork.packsToOpen).toBe(Math.ceil(pork.grams / 453.6));
    expect(pork.fullPacks).toBe(Math.floor(pork.grams / 453.6));
    expect(pork.leftoverGrams).toBeCloseTo(pork.packsToOpen * 453.6 - pork.grams, 9);
    expect(t.map((x) => x.product.id)).toEqual([KANGAROO.id, PORK.id, RABBIT.id]);
  });
});
