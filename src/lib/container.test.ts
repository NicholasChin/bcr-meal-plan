import { describe, expect, test } from 'vitest';
import { containerTarget } from './container';

const salmon1 = [{ supplementId: 'salmon-oil', amount: 1 }];
const pureDay = [{ supplementId: 'fortify', amount: 3 / 8 }, ...salmon1];

describe('containerTarget', () => {
  test('subtracts daily oil kcal before splitting into containers', () => {
    const t = containerTarget({ dailyKcal: 260, containersPerDay: 1, dailyDoses: pureDay, species: 'cat' });
    expect(t.supplements.map((s) => s.supplement.id)).toEqual(['fortify', 'salmon-oil']);
    expect(t.supplementKcal).toBeCloseTo(2.64 * 8.5, 6);
    expect(t.meatKcal).toBeCloseTo(260 - 2.64 * 8.5, 6);
  });

  test('divides meat kcal and doses across containers', () => {
    const t = containerTarget({ dailyKcal: 260, containersPerDay: 2, dailyDoses: pureDay, species: 'cat' });
    expect(t.meatKcal).toBeCloseTo((260 - 2.64 * 8.5) / 2, 6);
    expect(t.supplements[0]!.amount).toBeCloseTo(3 / 16, 9);
  });

  test('flags unmeasurable per-container doses and suggests a container count', () => {
    const t = containerTarget({ dailyKcal: 260, containersPerDay: 2, dailyDoses: pureDay, species: 'cat' });
    expect(t.unmeasurable.map((s) => s.supplement.id)).toEqual(['fortify', 'salmon-oil']);
    expect(t.suggestedContainersPerDay).toBe(1);
  });

  test('no supplements means meat carries the whole target', () => {
    const t = containerTarget({ dailyKcal: 240, containersPerDay: 2, dailyDoses: [], species: 'cat' });
    expect(t.meatKcal).toBe(120);
    expect(t.unmeasurable).toEqual([]);
  });

  test('treat kcal come out of the daily target before splitting', () => {
    const t = containerTarget({ dailyKcal: 260, containersPerDay: 2, dailyDoses: salmon1, species: 'cat', treatsKcal: 20 });
    expect(t.meatKcal).toBeCloseTo((260 - 20 - 2.64 * 8.5) / 2, 6);
    expect(t.treatsKcal).toBe(10);
  });

  test('ignores doses of zero', () => {
    const t = containerTarget({ dailyKcal: 240, containersPerDay: 1, dailyDoses: [{ supplementId: 'salmon-oil', amount: 0 }], species: 'cat' });
    expect(t.supplements).toEqual([]);
  });
});
