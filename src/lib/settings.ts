// Everything the owner sets, persisted to localStorage as versioned JSON.
import { lbToKg, type BodyType, type Species } from './energy';
import type { DailyDose, Line } from './types';

export type RecipeSetting = { line: Line; items: { productId: string; share: number }[]; count: number };

export type Settings = {
  version: 1;
  species: Species;
  weight: number;
  weightUnit: 'lb' | 'kg';
  bodyType: BodyType;
  /** Body condition score, 1–9 (5 = ideal). */
  bcs: number;
  /** Daily treat calories, subtracted from the target. */
  treatsKcal: number;
  /** When set, used everywhere instead of the estimate. */
  kcalOverride: number | null;
  /** Product ids the owner buys. null = all. */
  boughtProductIds: string[] | null;
  containersPerDay: number;
  supplements: {
    pure: { fortifyId: string | null; fortifyAmount: number; oilId: string | null; oilAmount: number };
  };
  oilNoteDismissed: boolean;
  tab: 'packages' | 'days';
  modeA: {
    line: Line;
    stock: { productId: string; packs: number }[];
    proteinsPerContainer: number;
    minSharePct: number;
    /** Container types (comboKey of product ids) the owner unticked. New types default to allowed. */
    excludedCombos: string[];
  };
  modeB: { days: number; basis: 'kcal' | 'weight'; recipes: RecipeSetting[] };
};

export const STORAGE_KEY = 'bcr-meal-plan/settings';

export function defaultSettings(): Settings {
  return {
    version: 1,
    species: 'cat',
    weight: 10,
    weightUnit: 'lb',
    bodyType: 'lean',
    bcs: 5,
    treatsKcal: 0,
    kcalOverride: null,
    boughtProductIds: null,
    containersPerDay: 1,
    supplements: {
      pure: { fortifyId: 'fortify', fortifyAmount: 0.5, oilId: 'salmon-oil', oilAmount: 1 },
    },
    oilNoteDismissed: false,
    tab: 'packages',
    modeA: { line: 'pure', stock: [], proteinsPerContainer: 2, minSharePct: 20, excludedCombos: [] },
    modeB: { days: 7, basis: 'kcal', recipes: [] },
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Deep-merge saved values over defaults: new fields get defaults, removed fields are dropped. */
function merge<T>(base: T, saved: unknown): T {
  if (!isObject(base) || !isObject(saved)) return (saved === undefined ? base : (saved as T));
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(saved)) if (k in out) out[k] = merge((base as Record<string, unknown>)[k], v);
  return out as T;
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return defaultSettings();
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isObject(saved) || saved.version !== 1) return defaultSettings();
    return merge(defaultSettings(), saved);
  } catch {
    return defaultSettings();
  }
}

export function dosesFor(s: Settings, line: Line): DailyDose[] {
  const out: DailyDose[] = [];
  // Fare Game is complete and balanced: no Fortify, no oil.
  if (line === 'pure') {
    const p = s.supplements.pure;
    if (p.fortifyId) out.push({ supplementId: p.fortifyId, amount: p.fortifyAmount });
    if (p.oilId) out.push({ supplementId: p.oilId, amount: p.oilAmount });
  }
  return out;
}

export const weightKg = (s: Settings) => (s.weightUnit === 'kg' ? s.weight : lbToKg(s.weight));
