// Mode A: packages in → containers out.
//
// Each container holds `meatKcalPerContainer` kcal from `proteinsPerContainer`
// different products, each at least `minShare` of the container's kcal.
// Pairings ("combos") rotate through every combination of the stocked products;
// counts start even and shift only as far as needed to use the packs up.
//
// Feasibility: give every (container, protein) slot its minimum share m. What's
// left in each container, r = 1 − N·m, can go to any of its proteins. Protein i
// still needs d_i = u_i − a_i·m (u_i: its kcal in container units, a_i: how many
// containers it appears in). That is a bipartite supply/demand problem, feasible
// iff every d_i ≥ 0 and, for every set S of proteins, Σ_{i∈S} d_i ≤ r · (number
// of containers containing any protein in S) — Hall's condition. Stocks are a
// handful of products, so we enumerate subsets directly, then recover the actual
// split with a small max-flow.
import { roundPortions, type Portion } from './recipes';
import type { Product } from './types';

export type StockItem = { product: Product; packs: number };

export type PackagesInput = {
  stock: StockItem[];
  meatKcalPerContainer: number;
  proteinsPerContainer: number;
  /** 0 … 1/proteinsPerContainer */
  minShare: number;
  /** Container types to make, as sets of product ids. Omit to allow every combination. */
  allowedCombos?: string[][];
};

export type PlannedContainer = { portions: Portion[]; meatKcal: number };

export type PackagesPlan = {
  ok: true;
  containers: PlannedContainer[];
  /** Identical containers grouped, in first-appearance order. */
  groups: { portions: Portion[]; meatKcal: number; count: number }[];
  comboCounts: { productIds: string[]; count: number }[];
  leftover: { product: Product; grams: number; kcal: number }[];
};

export type PackagesFailure = {
  ok: false;
  reason:
    | 'mixed-lines'
    | 'too-few-proteins'
    | 'not-enough-food'
    | 'min-share'
    | 'no-container-types'
    | 'unused-products'
    | 'container-types';
  /** For 'min-share': the highest minimum share (rounded down to 1%) that works. */
  maxMinShare?: number;
  /** For 'unused-products': stocked products that no allowed container type uses. */
  productIds?: string[];
};

const EPS = 1e-7;

function combinations(k: number, n: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, acc: number[]) => {
    if (acc.length === n) return void out.push([...acc]);
    for (let i = start; i < k; i++) rec(i + 1, [...acc, i]);
  };
  rec(0, []);
  return out;
}

type Problem = { u: number[]; combos: number[][]; N: number; n: number };

/** Sum of Hall-condition violations; 0 means feasible. */
function violation(p: Problem, counts: number[], m: number): number {
  const k = p.u.length;
  const r = 1 - p.N * m;
  const a = p.u.map((_, i) => p.combos.reduce((s, c, j) => s + (c.includes(i) ? counts[j]! : 0), 0));
  const d = p.u.map((ui, i) => ui - a[i]! * m);
  let v = 0;
  for (const di of d) if (di < -EPS) v += -di;
  for (let mask = 1; mask < 1 << k; mask++) {
    let need = 0;
    for (let i = 0; i < k; i++) if (mask & (1 << i)) need += Math.max(0, d[i]!);
    let cover = 0;
    p.combos.forEach((c, j) => {
      if (c.some((i) => mask & (1 << i))) cover += counts[j]!;
    });
    const over = need - r * cover;
    if (over > EPS) v += over;
  }
  return v;
}

function evenCounts(p: Problem): number[] {
  const P = p.combos.length;
  const counts = p.combos.map(() => Math.floor(p.n / P));
  // Extras go to the combos whose proteins have the most food.
  const order = p.combos
    .map((c, j) => ({ j, w: c.reduce((s, i) => s + p.u[i]!, 0) }))
    .sort((x, y) => y.w - x.w || x.j - y.j);
  for (let e = 0; e < p.n % P; e++) counts[order[e]!.j]!++;
  return counts;
}

/** Start even; move one container between combos at a time until feasible. */
function findCounts(p: Problem, m: number): number[] | null {
  let counts = evenCounts(p);
  let v = violation(p, counts, m);
  for (let iter = 0; v > EPS && iter < 50 * p.n + 50; iter++) {
    let best: { counts: number[]; v: number } | null = null;
    for (let from = 0; from < counts.length; from++) {
      if (counts[from] === 0) continue;
      for (let to = 0; to < counts.length; to++) {
        if (to === from) continue;
        const next = [...counts];
        next[from]!--;
        next[to]!++;
        const nv = violation(p, next, m);
        if (nv < v - EPS && (!best || nv < best.v - EPS)) best = { counts: next, v: nv };
      }
    }
    if (!best) return null;
    counts = best.counts;
    v = best.v;
  }
  return v <= EPS ? counts : null;
}

/** Edmonds–Karp max-flow on a dense capacity matrix. Returns the flow matrix. */
function maxFlow(cap: number[][], s: number, t: number): number[][] {
  const n = cap.length;
  const flow = cap.map((row) => row.map(() => 0));
  for (;;) {
    const prev = new Array<number>(n).fill(-1);
    prev[s] = s;
    const queue = [s];
    while (queue.length && prev[t] === -1) {
      const x = queue.shift()!;
      for (let y = 0; y < n; y++) {
        if (prev[y] === -1 && cap[x]![y]! - flow[x]![y]! > EPS) {
          prev[y] = x;
          queue.push(y);
        }
      }
    }
    if (prev[t] === -1) return flow;
    let push = Infinity;
    for (let y = t; y !== s; y = prev[y]!) push = Math.min(push, cap[prev[y]!]![y]! - flow[prev[y]!]![y]!);
    for (let y = t; y !== s; y = prev[y]!) {
      flow[prev[y]!]![y]! += push;
      flow[y]![prev[y]!]! -= push;
    }
  }
}

/** Per-combo shares (fractions of a container) for each member protein. */
function splitShares(p: Problem, counts: number[], m: number): Map<number, number>[] {
  const k = p.u.length;
  const P = p.combos.length;
  const r = 1 - p.N * m;
  const a = p.u.map((_, i) => p.combos.reduce((s, c, j) => s + (c.includes(i) ? counts[j]! : 0), 0));
  const d = p.u.map((ui, i) => Math.max(0, ui - a[i]! * m));
  // nodes: 0 source, 1..P combos, P+1..P+k proteins, P+k+1 sink
  const size = P + k + 2;
  const sink = size - 1;
  const cap = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  p.combos.forEach((c, j) => {
    cap[0]![1 + j] = counts[j]! * r;
    for (const i of c) cap[1 + j]![1 + P + i] = Infinity;
  });
  d.forEach((di, i) => (cap[1 + P + i]![sink] = di));
  const flow = maxFlow(cap, 0, sink);
  return p.combos.map((c, j) => {
    const shares = new Map<number, number>();
    for (const i of c) {
      const extra = counts[j]! > 0 ? Math.max(0, flow[1 + j]![1 + P + i]!) / counts[j]! : 0;
      shares.set(i, m + extra);
    }
    return shares;
  });
}

/**
 * The split closest to even (every share 1/N), found with Dykstra's alternating
 * projections onto: container sums = 1, protein totals = u, shares ≥ m.
 * Distances are weighted by how many containers use each combo. Falls back to
 * the max-flow split if it doesn't converge.
 */
function balancedShares(p: Problem, counts: number[], m: number): Map<number, number>[] {
  const N = p.N;
  const live = p.combos.map((_, j) => counts[j]! > 0);
  let x = p.combos.map((c) => c.map(() => 1 / N));
  const clone = (v: number[][]) => v.map((r) => [...r]);
  // Dykstra correction terms (only the box needs one; the other two sets are affine).
  let corrBox = p.combos.map((c) => c.map(() => 0));

  const projectSums = (v: number[][]) =>
    v.map((row) => {
      const shift = (row.reduce((s, a) => s + a, 0) - 1) / N;
      return row.map((a) => a - shift);
    });
  const projectTotals = (v: number[][]) => {
    const out = clone(v);
    p.u.forEach((ui, i) => {
      let have = 0;
      let weight = 0;
      p.combos.forEach((c, j) => {
        const k = c.indexOf(i);
        if (k >= 0 && live[j]) {
          have += counts[j]! * out[j]![k]!;
          weight += counts[j]!;
        }
      });
      if (weight === 0) return;
      const shift = (ui - have) / weight;
      p.combos.forEach((c, j) => {
        const k = c.indexOf(i);
        if (k >= 0 && live[j]) out[j]![k]! += shift;
      });
    });
    return out;
  };

  for (let iter = 0; iter < 20000; iter++) {
    const before = x;
    x = projectTotals(projectSums(x));
    const y = x.map((row, j) => row.map((a, k) => a + corrBox[j]![k]!));
    const clamped = y.map((row) => row.map((a) => Math.max(m, a)));
    corrBox = y.map((row, j) => row.map((a, k) => a - clamped[j]![k]!));
    x = clamped;
    let delta = 0;
    x.forEach((row, j) => row.forEach((a, k) => (delta = Math.max(delta, Math.abs(a - before[j]![k]!)))));
    if (delta < 1e-12) break;
  }

  // Verify; otherwise use the (valid but uneven) max-flow split.
  const sumsOk = x.every((row, j) => !live[j] || Math.abs(row.reduce((s, a) => s + a, 0) - 1) < 1e-6);
  const totalsOk = p.u.every((ui, i) => {
    const have = p.combos.reduce((s, c, j) => s + (c.includes(i) && live[j] ? counts[j]! * x[j]![c.indexOf(i)]! : 0), 0);
    return Math.abs(have - ui) < 1e-6;
  });
  const minOk = x.every((row, j) => !live[j] || row.every((a) => a >= m - 1e-9));
  if (!(sumsOk && totalsOk && minOk)) return splitShares(p, counts, m);
  return p.combos.map((c, j) => new Map(c.map((i, k) => [i, x[j]![k]!])));
}

/** Interleave combos so the same pairing doesn't repeat back-to-back. */
function rotationOrder(counts: number[]): number[] {
  const left = [...counts];
  const out: number[] = [];
  let prev = -1;
  const total = left.reduce((s, x) => s + x, 0);
  for (let t = 0; t < total; t++) {
    let pick = -1;
    for (let j = 0; j < left.length; j++) {
      if (left[j]! === 0 || j === prev) continue;
      if (pick === -1 || left[j]! > left[pick]!) pick = j;
    }
    if (pick === -1) pick = prev; // only one combo left
    out.push(pick);
    left[pick]!--;
    prev = pick;
  }
  return out;
}

/** Every container type (combination of `n` products) for the given products, in stock order. */
export function containerTypes<T>(items: T[], n: number): T[][] {
  return combinations(items.length, n).map((c) => c.map((i) => items[i]!));
}

/** Order-independent key for a set of product ids. */
export const comboKey = (ids: string[]) => [...ids].sort().join('+');

export function planPackages(input: PackagesInput): PackagesPlan | PackagesFailure {
  const stock = input.stock.filter((s) => s.packs > 0);
  const N = Math.floor(input.proteinsPerContainer);
  const C = input.meatKcalPerContainer;
  if (new Set(stock.map((s) => s.product.line)).size > 1) return { ok: false, reason: 'mixed-lines' };
  if (stock.length < N || N < 1) return { ok: false, reason: 'too-few-proteins' };

  const T = stock.map((s) => (s.packs * s.product.package.unitGrams * s.product.kcalPer100g) / 100);
  const totalKcal = T.reduce((s, x) => s + x, 0);
  const n = C > 0 ? Math.floor(totalKcal / C + 1e-9) : 0;
  if (n < 1) return { ok: false, reason: 'not-enough-food' };

  // The remainder (< 1 container) comes out of the most plentiful product.
  const used = [...T];
  const most = T.indexOf(Math.max(...T));
  used[most] = Math.max(0, used[most]! - (totalKcal - n * C));
  let combos = combinations(stock.length, N);
  if (input.allowedCombos) {
    const allowed = new Set(input.allowedCombos.map(comboKey));
    combos = combos.filter((c) => allowed.has(comboKey(c.map((i) => stock[i]!.product.id))));
    if (combos.length === 0) return { ok: false, reason: 'no-container-types' };
    const unused = stock.filter((_, i) => !combos.some((c) => c.includes(i))).map((st) => st.product.id);
    if (unused.length) return { ok: false, reason: 'unused-products', productIds: unused };
  }
  const problem: Problem = { u: used.map((x) => x / C), combos, N, n };

  const m = Math.min(Math.max(0, input.minShare), 1 / N);
  const counts = findCounts(problem, m);
  if (!counts) {
    let lo = 0;
    let hi = m;
    for (let i = 0; i < 25; i++) {
      const mid = (lo + hi) / 2;
      if (findCounts(problem, mid)) lo = mid;
      else hi = mid;
    }
    const maxMinShare = Math.floor(lo * 100) / 100;
    if (!findCounts(problem, maxMinShare)) return { ok: false, reason: 'container-types' };
    return { ok: false, reason: 'min-share', maxMinShare };
  }

  const shares = balancedShares(problem, counts, m);
  const comboPortions = problem.combos.map((c, j) =>
    roundPortions(
      c.map((i) => {
        const product = stock[i]!.product;
        return { product, grams: ((shares[j]!.get(i)! * C) / product.kcalPer100g) * 100 };
      }),
      C,
    ),
  );
  const sumKcal = (ps: Portion[]) => ps.reduce((s, x) => s + x.kcal, 0);

  const containers = rotationOrder(counts).map((j) => ({
    portions: comboPortions[j]!,
    meatKcal: sumKcal(comboPortions[j]!),
  }));

  const groups: PackagesPlan['groups'] = [];
  const seen = new Set<number>();
  for (const j of rotationOrder(counts)) {
    if (seen.has(j)) continue;
    seen.add(j);
    groups.push({ portions: comboPortions[j]!, meatKcal: sumKcal(comboPortions[j]!), count: counts[j]! });
  }

  const leftover = stock
    .map((s, i) => {
      const usedGrams = problem.combos.reduce(
        (acc, c, j) => acc + (c.includes(i) ? comboPortions[j]!.find((p) => p.product.id === s.product.id)!.grams * counts[j]! : 0),
        0,
      );
      const grams = s.packs * s.product.package.unitGrams - usedGrams;
      return { product: s.product, grams, kcal: (grams * s.product.kcalPer100g) / 100 };
    })
    .filter((l) => l.grams >= 1);

  return {
    ok: true,
    containers,
    groups,
    comboCounts: problem.combos
      .map((c, j) => ({ productIds: c.map((i) => stock[i]!.product.id), count: counts[j]! }))
      .filter((c) => c.count > 0),
    leftover,
  };
}
