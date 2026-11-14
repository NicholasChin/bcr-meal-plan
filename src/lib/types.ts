export type Line = 'pure' | 'fare-game';

export type Product = {
  id: string;
  name: string;
  line: Line;
  kcalPer100g: number;
  package: { unitGrams: number; label: string };
};

/** A daily supplement dose, in the supplement's unit (tsp or pumps). */
export type DailyDose = { supplementId: string; amount: number };
