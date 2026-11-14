import { describe, expect, test } from 'vitest';
import { parseNutrientValue, normalizeNutrientName, parseNutrientCsv, extractCsvPath, extractIngredients } from './parse';

describe('parseNutrientValue', () => {
  test('parses plain numbers', () => {
    expect(parseNutrientValue('153')).toEqual({ value: 153 });
    expect(parseNutrientValue('162.0')).toEqual({ value: 162 });
  });
  test('parses "<0,1" as an upper bound with decimal comma', () => {
    expect(parseNutrientValue('<0,1')).toEqual({ value: 0.1, lessThan: true });
  });
  test('treats N/A, dash and empty as null', () => {
    expect(parseNutrientValue('N/A')).toBeNull();
    expect(parseNutrientValue('')).toBeNull();
    expect(parseNutrientValue('-')).toBeNull();
  });
});

describe('normalizeNutrientName', () => {
  test('drops min/max qualifiers and collapses whitespace', () => {
    expect(normalizeNutrientName('Calories (min - kcal)')).toBe('Calories (kcal)');
    expect(normalizeNutrientName('Calcium (min - g)')).toBe('Calcium (g)');
    expect(normalizeNutrientName('Fiber (max - g)')).toBe('Fiber (g)');
    expect(normalizeNutrientName('Iron  (mg)')).toBe('Iron (mg)');
  });
});

describe('parseNutrientCsv', () => {
  const csv = '﻿Nutrients,Amount,Is Main Nutrient?\r\nCalories (min - kcal),153,1\r\nIron  (mg),4.89,\r\nVitamin D (mcg),N/A,\r\n';
  test('returns normalized nutrients keyed by name', () => {
    expect(parseNutrientCsv(csv)).toEqual({
      'Calories (kcal)': { value: 153 },
      'Iron (mg)': { value: 4.89 },
      'Vitamin D (mcg)': null,
    });
  });
});

describe('page extraction', () => {
  const page = `<div class="csv__nutrients" data-nutrient-facts-index="0" data-csv="/content/product-csv/pure_beef.csv"></div>
    <meta content="&lt;div class=&quot;prod_ingredients&quot;&gt;
&lt;p&gt;&lt;span&gt;Beef meat, beef heart.&lt;/span&gt;&lt;/p&gt;
&lt;/div&gt;">`;
  test('finds the nutrient CSV path', () => {
    expect(extractCsvPath(page)).toBe('/content/product-csv/pure_beef.csv');
  });
  test('extracts ingredient text from escaped HTML', () => {
    expect(extractIngredients(page)).toBe('Beef meat, beef heart.');
  });
});
