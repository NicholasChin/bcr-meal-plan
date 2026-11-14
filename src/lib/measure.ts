// Kitchen-measurable amounts: tsp in ⅛ steps (1, ½, ¼, ⅛ spoons), whole pumps.

export type DoseUnit = 'tsp' | 'pump';
const EIGHTH = 0.125;
const EPS = 1e-6;
const SPOONS = [1, 0.5, 0.25, 0.125];

const near = (a: number, b: number) => Math.abs(a - b) < EPS;
const step = (unit: DoseUnit) => (unit === 'tsp' ? EIGHTH : 1);

export function isMeasurable(amount: number, unit: DoseUnit): boolean {
  const s = step(unit);
  return amount >= s - EPS && near(amount / s, Math.round(amount / s));
}

export function spoonCombo(tsp: number): number[] | null {
  if (!isMeasurable(tsp, 'tsp')) return null;
  const out: number[] = [];
  let left = Math.round(tsp / EIGHTH) * EIGHTH;
  for (const s of SPOONS) {
    while (left >= s - EPS) {
      out.push(s);
      left -= s;
    }
  }
  return out;
}

export function roundToMeasurable(amount: number, unit: DoseUnit): number {
  const s = step(unit);
  return Math.max(s, Math.round(amount / s) * s);
}

const GLYPH: Record<number, string> = { 1: '⅛', 2: '¼', 3: '⅜', 4: '½', 5: '⅝', 6: '¾', 7: '⅞' };

function fractionText(tsp: number): string {
  const eighths = Math.round(tsp / EIGHTH);
  const whole = Math.floor(eighths / 8);
  const rest = eighths % 8;
  return `${whole || rest === 0 ? whole : ''}${rest ? GLYPH[rest] : ''}`;
}

export function formatAmount(amount: number, unit: DoseUnit): string {
  if (unit === 'pump') {
    const n = isMeasurable(amount, 'pump') ? String(Math.round(amount)) : String(+amount.toFixed(2));
    return `${n} ${amount === 1 ? 'pump' : amount > 1 ? 'pumps' : 'pump'}`;
  }
  if (!isMeasurable(amount, 'tsp')) return `${+amount.toFixed(2)} tsp`;
  const text = `${fractionText(amount)} tsp`;
  const combo = spoonCombo(amount)!;
  // Only spell out the spoons for sub-teaspoon amounts that need more than one spoon.
  return amount < 1 && combo.length > 1 ? `${text} (${combo.map(fractionText).join(' + ')})` : text;
}

export function maxMeasurableContainersPerDay(
  dailyDoses: { amount: number; unit: DoseUnit }[],
  cap = 4,
): number {
  for (let n = cap; n > 1; n--) {
    if (dailyDoses.every((d) => isMeasurable(d.amount / n, d.unit))) return n;
  }
  return 1;
}
