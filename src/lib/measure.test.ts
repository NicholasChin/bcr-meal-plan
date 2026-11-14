import { describe, expect, test } from 'vitest';
import { isMeasurable, spoonCombo, roundToMeasurable, formatAmount, maxMeasurableContainersPerDay } from './measure';

describe('isMeasurable', () => {
  test('tsp amounts must be whole multiples of ⅛, at least ⅛', () => {
    expect(isMeasurable(3 / 8, 'tsp')).toBe(true);
    expect(isMeasurable(3 / 16, 'tsp')).toBe(false);
    expect(isMeasurable(0, 'tsp')).toBe(false);
    expect(isMeasurable(3.75, 'tsp')).toBe(true);
  });
  test('pumps must be whole and at least 1', () => {
    expect(isMeasurable(1, 'pump')).toBe(true);
    expect(isMeasurable(0.5, 'pump')).toBe(false);
  });
  test('tolerates floating point noise', () => {
    expect(isMeasurable(0.1 + 0.275, 'tsp')).toBe(true);
  });
});

describe('spoonCombo', () => {
  test('breaks a tsp amount into standard spoons', () => {
    expect(spoonCombo(3 / 8)).toEqual([0.25, 0.125]);
    expect(spoonCombo(1.75)).toEqual([1, 0.5, 0.25]);
    expect(spoonCombo(0.5)).toEqual([0.5]);
  });
  test('returns null for unmeasurable amounts', () => {
    expect(spoonCombo(3 / 16)).toBeNull();
  });
});

describe('roundToMeasurable', () => {
  test('rounds tsp to nearest ⅛ with a ⅛ minimum', () => {
    expect(roundToMeasurable(0.45, 'tsp')).toBe(0.5);
    expect(roundToMeasurable(0.03, 'tsp')).toBe(0.125);
  });
  test('rounds pumps to nearest whole with a 1 pump minimum', () => {
    expect(roundToMeasurable(0.71, 'pump')).toBe(1);
    expect(roundToMeasurable(1.6, 'pump')).toBe(2);
  });
});

describe('formatAmount', () => {
  test('uses fraction glyphs and spoon combos for tsp', () => {
    expect(formatAmount(3 / 8, 'tsp')).toBe('⅜ tsp (¼ + ⅛)');
    expect(formatAmount(0.5, 'tsp')).toBe('½ tsp');
    expect(formatAmount(3.75, 'tsp')).toBe('3¾ tsp');
  });
  test('shows unmeasurable tsp amounts as decimals', () => {
    expect(formatAmount(3 / 16, 'tsp')).toBe('0.19 tsp');
  });
  test('pluralises pumps', () => {
    expect(formatAmount(1, 'pump')).toBe('1 pump');
    expect(formatAmount(10, 'pump')).toBe('10 pumps');
    expect(formatAmount(0.5, 'pump')).toBe('0.5 pump');
  });
});

describe('maxMeasurableContainersPerDay', () => {
  test('finds the most containers/day that keep every dose measurable', () => {
    const doses = [{ amount: 3 / 8, unit: 'tsp' as const }, { amount: 1, unit: 'pump' as const }];
    expect(maxMeasurableContainersPerDay(doses)).toBe(1);
    expect(maxMeasurableContainersPerDay([{ amount: 0.5, unit: 'tsp' }, { amount: 2, unit: 'pump' }])).toBe(2);
  });
  test('with no doses, any count is fine (returns the cap)', () => {
    expect(maxMeasurableContainersPerDay([], 4)).toBe(4);
  });
});
