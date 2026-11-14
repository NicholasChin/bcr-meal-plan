import { describe, expect, test } from 'vitest';
import { planPackages, type PackagesPlan } from './packages';
import { FG_CB, KANGAROO, PORK, RABBIT } from './testProducts';
import type { Product } from './types';

const C = 130;
const kcalIn = (p: Product, packs: number) => (packs * p.package.unitGrams * p.kcalPer100g) / 100;
const ok = (r: ReturnType<typeof planPackages>): PackagesPlan => {
  if (!r.ok) throw new Error(`expected a plan, got ${r.reason}`);
  return r;
};

function expectValidPlan(plan: PackagesPlan, stock: { product: Product; packs: number }[], minShare: number) {
  const total = stock.reduce((s, x) => s + kcalIn(x.product, x.packs), 0);
  expect(plan.containers.length).toBe(Math.floor(total / C));
  for (const c of plan.containers) {
    // within rounding of whole grams (±0.5 g of the densest food per portion)
    expect(Math.abs(c.meatKcal - C)).toBeLessThan(2.5);
    for (const p of c.portions) expect(p.kcal / c.meatKcal).toBeGreaterThanOrEqual(minShare - 0.02);
  }
  for (const { product, packs } of stock) {
    const used = plan.containers.flatMap((c) => c.portions).filter((p) => p.product.id === product.id)
      .reduce((s, p) => s + p.grams, 0);
    expect(used).toBeLessThanOrEqual(packs * product.package.unitGrams + plan.containers.length * 0.5);
  }
  const leftoverKcal = plan.leftover.reduce((s, l) => s + l.kcal, 0);
  expect(leftoverKcal).toBeLessThan(C + 5);
}

describe('planPackages', () => {
  test('two proteins: every container uses the same split and the packs get used up', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 }));
    expectValidPlan(plan, stock, 0.2);
    expect(plan.groups.length).toBe(1);
    expect(plan.groups[0]!.count).toBe(12);
  });

  test('three proteins rotate through every pairing about evenly', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 }));
    expectValidPlan(plan, stock, 0.2);
    const counts = plan.comboCounts.map((c) => c.count);
    expect(counts.length).toBe(3);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  test('splits stay as close to even as the stock allows', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: 238, proteinsPerContainer: 2, minShare: 0.2 }));
    // An even-ish answer exists with every protein ≥ ~36% of its container.
    for (const c of plan.containers) for (const p of c.portions) expect(p.kcal / c.meatKcal).toBeGreaterThan(0.3);
  });

  test('consecutive containers use different pairings when possible', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 }));
    const keys = plan.containers.map((c) => c.portions.map((p) => p.product.id).join('+'));
    for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
  });

  test('lopsided stock shifts pairings instead of failing', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 3 }, { product: RABBIT, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 }));
    expectValidPlan(plan, stock, 0.2);
    const count = (a: string, b: string) =>
      plan.comboCounts.find((c) => c.productIds.includes(a) && c.productIds.includes(b))?.count ?? 0;
    expect(count(KANGAROO.id, RABBIT.id)).toBeLessThan(count(KANGAROO.id, PORK.id));
  });

  test('impossible minimum share fails and reports the highest minimum that works', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 4 }];
    const r = planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('min-share');
    expect(r.maxMinShare).toBeGreaterThan(0.05);
    expect(r.maxMinShare).toBeLessThan(0.2);
    const retry = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: r.maxMinShare! }));
    expectValidPlan(retry, stock, r.maxMinShare!);
  });

  test('a minimum share of 0 always works', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 4 }];
    expectValidPlan(ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0 })), stock, 0);
  });

  test('three proteins per container uses a single combination', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 3, minShare: 0.2 }));
    expectValidPlan(plan, stock, 0.2);
    expect(plan.comboCounts.length).toBe(1);
  });

  test('only makes the allowed container types', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const allowed = [[KANGAROO.id, PORK.id], [RABBIT.id, PORK.id]];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2, allowedCombos: allowed }));
    expectValidPlan(plan, stock, 0.2);
    for (const c of plan.containers) expect(c.portions.map((p) => p.product.id)).toContain(PORK.id);
    expect(plan.comboCounts.length).toBe(2);
  });

  test('allowed container types match regardless of product order', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }];
    const plan = ok(planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2, allowedCombos: [[PORK.id, KANGAROO.id]] }));
    expect(plan.comboCounts.length).toBe(1);
  });

  test('fails when no container type is allowed', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }];
    const r = planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2, allowedCombos: [] });
    expect(r).toMatchObject({ ok: false, reason: 'no-container-types' });
  });

  test('fails and names products that no allowed container type uses', () => {
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const r = planPackages({ stock, meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2, allowedCombos: [[KANGAROO.id, PORK.id]] });
    expect(r).toMatchObject({ ok: false, reason: 'unused-products', productIds: [RABBIT.id] });
  });

  test('fails when allowed container types cannot use up the packages at any minimum share', () => {
    // 3 containers of 615 kcal: Pork (~1.0 container's worth after the leftover) and
    // Rabbit (~1.06) each need 2 containers of their type — 4 containers, but only 3 exist.
    const stock = [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }, { product: RABBIT, packs: 1 }];
    const r = planPackages({
      stock, meatKcalPerContainer: 615, proteinsPerContainer: 2, minShare: 0,
      allowedCombos: [[KANGAROO.id, PORK.id], [KANGAROO.id, RABBIT.id]],
    });
    expect(r).toMatchObject({ ok: false, reason: 'container-types' });
  });

  test('rejects mixing Pures with Fare Game', () => {
    const r = planPackages({ stock: [{ product: KANGAROO, packs: 1 }, { product: FG_CB, packs: 2 }], meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 });
    expect(r).toMatchObject({ ok: false, reason: 'mixed-lines' });
  });

  test('rejects fewer proteins than slots per container', () => {
    const r = planPackages({ stock: [{ product: KANGAROO, packs: 2 }], meatKcalPerContainer: C, proteinsPerContainer: 2, minShare: 0.2 });
    expect(r).toMatchObject({ ok: false, reason: 'too-few-proteins' });
  });

  test('not enough food for a single container', () => {
    const r = planPackages({ stock: [{ product: KANGAROO, packs: 1 }, { product: PORK, packs: 1 }], meatKcalPerContainer: 5000, proteinsPerContainer: 2, minShare: 0.2 });
    expect(r).toMatchObject({ ok: false, reason: 'not-enough-food' });
  });
});
