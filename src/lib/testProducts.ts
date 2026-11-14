// Test fixtures shaped like src/data/products.json entries.
import type { Product } from './types';

const LB = 453.6;
const pure = (id: string, kcalPer100g: number): Product => ({
  id, name: id, line: 'pure', kcalPer100g, package: { unitGrams: LB, label: '1 lb pack' },
});

export const KANGAROO = pure('pure-kangaroo', 127);
export const PORK = pure('pure-pork', 220);
export const RABBIT = pure('pure-rabbit', 143);
export const TURKEY = pure('pure-turkey', 182);
export const FG_CB: Product = {
  id: 'fare-game-chicken-and-beef', name: 'FG C&B', line: 'fare-game', kcalPer100g: 146,
  package: { unitGrams: LB / 2, label: '½ lb portion' },
};
