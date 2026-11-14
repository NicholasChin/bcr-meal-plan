// Thrive supplements. Fat per dose unit is from BCR's nutrient sheets
// (fish/hemp oils are listed per 2.8 ml pump; ahiflower per 5 ml tsp).
import { fatKcalPerGram, type Species } from './energy';
import { roundToMeasurable, type DoseUnit } from './measure';

export type SupplementKind = 'fortify' | 'oil';
export type Supplement = {
  id: string;
  name: string;
  url: string;
  kind: SupplementKind;
  unit: DoseUnit;
  fatGramsPerUnit: number;
};

const PUMP_ML = 2.8;
const TSP_ML = 5;

export const SUPPLEMENTS: Supplement[] = [
  { id: 'fortify', name: 'Thrive Fortify', kind: 'fortify', unit: 'tsp', fatGramsPerUnit: 0,
    url: 'https://bigcountryraw.ca/thrive-fortify-fusion-150-g/' },
  { id: 'fortifyrx', name: 'Thrive FortifyRX', kind: 'fortify', unit: 'tsp', fatGramsPerUnit: 0,
    url: 'https://bigcountryraw.ca/thrive-fortifyrx-fusion-150-g/' },
  { id: 'herring-oil', name: 'Thrive Herring Oil', kind: 'oil', unit: 'pump', fatGramsPerUnit: 2.56,
    url: 'https://bigcountryraw.ca/thrive-herring-oil-500-ml/' },
  { id: 'salmon-oil', name: 'Thrive Salmon Oil', kind: 'oil', unit: 'pump', fatGramsPerUnit: 2.64,
    url: 'https://bigcountryraw.ca/thrive-salmon-oil-500-ml/' },
  // Hemp: 2.39 g fat per 2.8 ml pump, dosed in tsp per BCR's label.
  { id: 'hemp-seed-oil', name: 'Thrive Hemp Seed Oil', kind: 'oil', unit: 'tsp',
    fatGramsPerUnit: (2.39 / PUMP_ML) * TSP_ML, url: 'https://bigcountryraw.ca/thrive-hemp-seed-oil-500-ml/' },
  { id: 'ahiflower-oil', name: 'Thrive Ahiflower Oil', kind: 'oil', unit: 'tsp', fatGramsPerUnit: 4.6,
    url: 'https://bigcountryraw.ca/thrive-ahiflower-oil-250-ml/' },
];

export function getSupplement(id: string): Supplement {
  const s = SUPPLEMENTS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown supplement ${id}`);
  return s;
}

const FORTIFYRX_STEPS: [lb: number, tsp: number][] = [
  [5, 0.25], [10, 0.5], [20, 0.75], [40, 1], [60, 1.25], [80, 1.5], [100, 2],
];

function rawDailyDose(id: string, lb: number): number | null {
  switch (id) {
    case 'fortify': return (lb / 10) * 0.5;
    case 'fortifyrx': {
      let best = FORTIFYRX_STEPS[0]!;
      for (const s of FORTIFYRX_STEPS) if (Math.abs(s[0] - lb) < Math.abs(best[0] - lb)) best = s;
      return best[1];
    }
    case 'herring-oil':
    case 'salmon-oil': return ((lb / 25) * 5) / PUMP_ML;
    case 'hemp-seed-oil': return lb / 25;
    default: return null;
  }
}

/** BCR's label dose for a body weight in lb, rounded to a kitchen-measurable amount. */
export function defaultDailyDose(id: string, weightLb: number): number | null {
  const raw = rawDailyDose(id, weightLb);
  return raw === null ? null : roundToMeasurable(raw, getSupplement(id).unit);
}

export function supplementKcal(s: Supplement, amount: number, species: Species): number {
  return s.fatGramsPerUnit * amount * fatKcalPerGram(species);
}
