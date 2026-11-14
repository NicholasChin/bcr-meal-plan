// Species-keyed energy math. Add a 'dog' branch here when dogs are supported.

export type Species = 'cat' | 'dog';
export type BodyType = 'lean' | 'prone';

const KG_PER_LB = 0.45359237;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

/** Daily maintenance energy (kcal) — NRC 2006 formulas used by WSAVA's chart. */
export function estimateDailyKcal(species: Species, kg: number, body: BodyType): number {
  if (!(kg > 0)) return 0;
  if (species !== 'cat') throw new Error(`No calorie formula for ${species} yet`);
  return body === 'lean' ? 100 * kg ** 0.67 : 130 * kg ** 0.4;
}

/** WSAVA "Calorie Needs for Healthy Adult Cats" (updated July 2020). */
const WSAVA_CAT: [kg: number, min: number, max: number][] = [
  [1.0, 100, 130], [1.5, 130, 150], [2.0, 160, 170], [2.5, 180, 190],
  [3.0, 200, 210], [3.5, 215, 230], [4.0, 225, 250], [4.5, 240, 270],
  [5.0, 250, 290], [5.5, 260, 310], [6.0, 265, 330], [6.5, 275, 350],
  [7.0, 280, 370],
];

export function wsavaRange(species: Species, kg: number): { kg: number; min: number; max: number } | null {
  if (species !== 'cat') return null;
  const row = WSAVA_CAT.find(([w]) => Math.abs(w - kg) <= 0.25);
  return row ? { kg: row[0], min: row[1], max: row[2] } : null;
}

/** ME of fat in natural-state ingredients — FEDIAF Nutritional Guidelines 2025 §7.2.2.2(b). */
export function fatKcalPerGram(species: Species): number {
  return species === 'cat' ? 8.5 : 9;
}

// Body condition score, 9-point scale. AAHA 2021 Nutrition and Weight Management
// Guidelines (JAAHA 57:4): "each BCS >5/9 is equivalent to being 10% overweight";
// base calorie calculations on ideal weight if overweight, current weight otherwise.
export type BcsCategory = 'under' | 'ideal' | 'over';

export function bcsCategory(bcs: number): BcsCategory {
  return bcs < 4 ? 'under' : bcs > 5 ? 'over' : 'ideal';
}

/** The weight to base calories on: current weight, or estimated ideal weight if overweight. */
export function calorieWeightKg(kg: number, bcs: number): number {
  return bcs > 5 ? kg / (1 + 0.1 * (bcs - 5)) : kg;
}

/** AAHA 2021: treats and other extras should be ≤10% of total daily calories. */
export function treatsOverLimit(dailyKcal: number, treatsKcal: number): boolean {
  return treatsKcal > 0.1 * dailyKcal + 1e-9;
}
