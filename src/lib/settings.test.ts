import { describe, expect, test } from 'vitest';
import { defaultSettings, parseSettings, dosesFor, weightKg } from './settings';

describe('parseSettings', () => {
  test('falls back to defaults for missing or corrupt storage', () => {
    expect(parseSettings(null)).toEqual(defaultSettings());
    expect(parseSettings('{not json')).toEqual(defaultSettings());
    expect(parseSettings(JSON.stringify({ version: 999 }))).toEqual(defaultSettings());
  });
  test('keeps saved values and fills in new fields from defaults', () => {
    const saved = { version: 1, weight: 9, kcalOverride: 250 };
    const s = parseSettings(JSON.stringify(saved));
    expect(s.weight).toBe(9);
    expect(s.kcalOverride).toBe(250);
    expect(s.containersPerDay).toBe(defaultSettings().containersPerDay);
  });
});

describe('defaults', () => {
  test('one container per day, weight in lb, 20% minimum share', () => {
    const d = defaultSettings();
    expect(d.containersPerDay).toBe(1);
    expect(d.weightUnit).toBe('lb');
    expect(d.modeA.minSharePct).toBe(20);
    expect(d.bcs).toBe(5);
    expect(d.treatsKcal).toBe(0);
    expect(d.modeA.excludedCombos).toEqual([]);
  });
});

describe('dosesFor', () => {
  test('Pure containers get Fortify and the Pure oil', () => {
    const s = defaultSettings();
    s.supplements.pure = { fortifyId: 'fortify', fortifyAmount: 0.375, oilId: 'salmon-oil', oilAmount: 1 };
    expect(dosesFor(s, 'pure')).toEqual([
      { supplementId: 'fortify', amount: 0.375 },
      { supplementId: 'salmon-oil', amount: 1 },
    ]);
  });
  test('Fare Game containers get no supplements', () => {
    const s = defaultSettings();
    s.supplements.pure = { fortifyId: 'fortify', fortifyAmount: 0.375, oilId: 'salmon-oil', oilAmount: 1 };
    expect(dosesFor(s, 'fare-game')).toEqual([]);
  });
  test('ignores a Fare Game oil left in old saved settings', () => {
    const s = parseSettings(JSON.stringify({ version: 1, supplements: { fareGame: { oilId: 'herring-oil', oilAmount: 1 } } }));
    expect(dosesFor(s, 'fare-game')).toEqual([]);
    expect('fareGame' in s.supplements).toBe(false);
  });
});

describe('weightKg', () => {
  test('converts from the chosen unit', () => {
    const s = { ...defaultSettings(), weight: 10, weightUnit: 'lb' as const };
    expect(weightKg(s)).toBeCloseTo(4.536, 3);
    expect(weightKg({ ...s, weightUnit: 'kg' })).toBe(10);
  });
});
