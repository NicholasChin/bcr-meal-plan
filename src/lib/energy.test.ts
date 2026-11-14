import { describe, expect, test } from 'vitest';
import { estimateDailyKcal, wsavaRange, lbToKg, kgToLb, fatKcalPerGram, calorieWeightKg, bcsCategory, treatsOverLimit } from './energy';

describe('estimateDailyKcal (cat, NRC 2006 via WSAVA)', () => {
  test('lean adult uses 100 × kg^0.67', () => {
    expect(estimateDailyKcal('cat', 4.5, 'lean')).toBeCloseTo(100 * 4.5 ** 0.67, 6);
    expect(Math.round(estimateDailyKcal('cat', 4.5, 'lean'))).toBe(274);
  });
  test('weight-gain-prone adult uses 130 × kg^0.4', () => {
    expect(estimateDailyKcal('cat', 4.5, 'prone')).toBeCloseTo(130 * 4.5 ** 0.4, 6);
  });
  test('returns 0 for non-positive weight', () => {
    expect(estimateDailyKcal('cat', 0, 'lean')).toBe(0);
  });
});

describe('wsavaRange', () => {
  test('returns the chart row for an exact weight', () => {
    expect(wsavaRange('cat', 4.5)).toEqual({ kg: 4.5, min: 240, max: 270 });
  });
  test('snaps to the nearest 0.5 kg row', () => {
    expect(wsavaRange('cat', 4.1)?.kg).toBe(4.0);
    expect(wsavaRange('cat', 4.3)?.kg).toBe(4.5);
  });
  test('is null outside the chart (1–7 kg)', () => {
    expect(wsavaRange('cat', 0.5)).toBeNull();
    expect(wsavaRange('cat', 8)).toBeNull();
  });
});

describe('units and fat energy', () => {
  test('converts lb and kg', () => {
    expect(lbToKg(10)).toBeCloseTo(4.536, 3);
    expect(kgToLb(4.536)).toBeCloseTo(10, 3);
  });
  test('uses FEDIAF fat factors: 8.5 kcal/g for cats, 9 for dogs', () => {
    expect(fatKcalPerGram('cat')).toBe(8.5);
    expect(fatKcalPerGram('dog')).toBe(9);
  });
});

describe('body condition score (AAHA 2021: each point above 5/9 ≈ 10% overweight)', () => {
  test('ideal or underweight: calculate from current weight', () => {
    expect(calorieWeightKg(5, 5)).toBe(5);
    expect(calorieWeightKg(5, 4)).toBe(5);
    expect(calorieWeightKg(5, 2)).toBe(5);
  });
  test('overweight: calculate from estimated ideal weight', () => {
    expect(calorieWeightKg(6, 7)).toBeCloseTo(6 / 1.2, 9);
    expect(calorieWeightKg(6, 9)).toBeCloseTo(6 / 1.4, 9);
  });
  test('classifies scores', () => {
    expect(bcsCategory(3)).toBe('under');
    expect(bcsCategory(4)).toBe('ideal');
    expect(bcsCategory(5)).toBe('ideal');
    expect(bcsCategory(6)).toBe('over');
  });
});

describe('treatsOverLimit (AAHA 2021: treats ≤ 10% of daily calories)', () => {
  test('flags treats above 10% of the daily total', () => {
    expect(treatsOverLimit(250, 25)).toBe(false);
    expect(treatsOverLimit(250, 26)).toBe(true);
    expect(treatsOverLimit(250, 0)).toBe(false);
  });
});
