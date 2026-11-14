import { describe, expect, test } from 'vitest';
import { SUPPLEMENTS, getSupplement, defaultDailyDose, supplementKcal } from './supplements';

describe('supplement catalog', () => {
  test('has Fortify, FortifyRX and four oils', () => {
    expect(SUPPLEMENTS.map((s) => s.id)).toEqual([
      'fortify', 'fortifyrx', 'herring-oil', 'salmon-oil', 'hemp-seed-oil', 'ahiflower-oil',
    ]);
  });
});

describe('defaultDailyDose (BCR label, rounded to measurable)', () => {
  test('Fortify: ½ tsp per 10 lb', () => {
    expect(defaultDailyDose('fortify', 10)).toBe(0.5);
    expect(defaultDailyDose('fortify', 7.5)).toBe(0.375);
    expect(defaultDailyDose('fortify', 9)).toBe(0.5);
  });
  test('FortifyRX: stepped table, nearest listed weight', () => {
    expect(defaultDailyDose('fortifyrx', 12)).toBe(0.5);
    expect(defaultDailyDose('fortifyrx', 3)).toBe(0.25);
    expect(defaultDailyDose('fortifyrx', 16)).toBe(0.75);
  });
  test('fish oils: 5 ml per 25 lb in 2.8 ml pumps, min 1 pump', () => {
    expect(defaultDailyDose('herring-oil', 10)).toBe(1);
    expect(defaultDailyDose('salmon-oil', 40)).toBe(3);
  });
  test('hemp seed oil: 1 tsp per 25 lb', () => {
    expect(defaultDailyDose('hemp-seed-oil', 10)).toBe(0.375);
  });
  test('ahiflower has no published dose', () => {
    expect(defaultDailyDose('ahiflower-oil', 10)).toBeNull();
  });
});

describe('supplementKcal', () => {
  test('oil kcal = fat grams × species fat factor', () => {
    expect(supplementKcal(getSupplement('salmon-oil'), 1, 'cat')).toBeCloseTo(2.64 * 8.5, 6);
    expect(supplementKcal(getSupplement('herring-oil'), 2, 'dog')).toBeCloseTo(2 * 2.56 * 9, 6);
  });
  test('Fortify products count as 0 kcal', () => {
    expect(supplementKcal(getSupplement('fortify'), 0.5, 'cat')).toBe(0);
  });
});
