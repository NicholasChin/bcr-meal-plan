import type { Species } from './energy';
import { isMeasurable, maxMeasurableContainersPerDay } from './measure';
import { getSupplement, supplementKcal, type Supplement } from './supplements';
import type { DailyDose } from './types';

export type ContainerSupplement = { supplement: Supplement; amount: number; kcal: number };

export type ContainerTarget = {
  /** Meat kcal each container must hold. */
  meatKcal: number;
  /** Per-container supplement amounts and their kcal. */
  supplements: ContainerSupplement[];
  supplementKcal: number;
  /** Treat kcal attributed to each container. */
  treatsKcal: number;
  unmeasurable: ContainerSupplement[];
  suggestedContainersPerDay: number;
};

export function containerTarget(opts: {
  dailyKcal: number;
  containersPerDay: number;
  dailyDoses: DailyDose[];
  species: Species;
  /** Daily treat kcal, subtracted from the target. */
  treatsKcal?: number;
}): ContainerTarget {
  const n = Math.max(1, Math.floor(opts.containersPerDay));
  const doses = opts.dailyDoses.filter((d) => d.amount > 0);
  const supplements = doses.map((d) => {
    const supplement = getSupplement(d.supplementId);
    const amount = d.amount / n;
    return { supplement, amount, kcal: supplementKcal(supplement, amount, opts.species) };
  });
  const treats = Math.max(0, opts.treatsKcal ?? 0);
  const suppKcal = supplements.reduce((s, x) => s + x.kcal, 0);
  return {
    meatKcal: (opts.dailyKcal - treats) / n - suppKcal,
    supplements,
    supplementKcal: suppKcal,
    treatsKcal: treats / n,
    unmeasurable: supplements.filter((s) => !isMeasurable(s.amount, s.supplement.unit)),
    suggestedContainersPerDay: maxMeasurableContainersPerDay(
      doses.map((d) => ({ amount: d.amount, unit: getSupplement(d.supplementId).unit })),
      Math.max(n, 1),
    ),
  };
}
