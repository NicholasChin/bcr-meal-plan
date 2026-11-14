import { dailyKcal, type Update } from '../app';
import { containerTarget } from '../lib/container';
import { planRecipe, thawTotals } from '../lib/recipes';
import { dosesFor, type RecipeSetting, type Settings } from '../lib/settings';
import type { Line } from '../lib/types';
import { boughtProducts, LINE_LABEL, productById, shortName } from '../products';
import { ContainerCard, DoseWarning, PrintButton } from './PrepSheet';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function splitEvenly(recipes: RecipeSetting[], total: number) {
  recipes.forEach((r, i) => (r.count = Math.floor(total / recipes.length) + (i < total % recipes.length ? 1 : 0)));
}

export function DaysMode({ s, update }: { s: Settings; update: Update }) {
  const b = s.modeB;
  const needed = b.days * s.containersPerDay;
  const assigned = b.recipes.reduce((sum, r) => sum + r.count, 0);
  const targets = {
    pure: containerTarget({ dailyKcal: dailyKcal(s), containersPerDay: s.containersPerDay, dailyDoses: dosesFor(s, 'pure'), species: s.species, treatsKcal: s.treatsKcal }),
    'fare-game': containerTarget({ dailyKcal: dailyKcal(s), containersPerDay: s.containersPerDay, dailyDoses: dosesFor(s, 'fare-game'), species: s.species, treatsKcal: s.treatsKcal }),
  };

  const addRecipe = () =>
    update((x) => {
      const line: Line = x.modeB.recipes.at(-1)?.line ?? 'pure';
      const ids = boughtProducts(x.boughtProductIds, line).slice(0, 2).map((p) => p.id);
      x.modeB.recipes.push({ line, items: ids.map((productId) => ({ productId, share: 50 })), count: 0 });
      splitEvenly(x.modeB.recipes, x.modeB.days * x.containersPerDay);
    });
  const editRecipe = (i: number, fn: (r: RecipeSetting) => void) => update((x) => fn(x.modeB.recipes[i]!));

  const planned = b.recipes.map((r) => {
    const items = r.items
      .filter((it) => productById.get(it.productId)?.line === r.line && it.share > 0)
      .map((it) => ({ product: productById.get(it.productId)!, share: it.share }));
    return { setting: r, plan: items.length ? planRecipe({ items, basis: b.basis, count: r.count }, targets[r.line].meatKcal) : null };
  });
  const valid = planned.filter((p) => p.plan && p.setting.count > 0);
  const thaw = thawTotals(valid.map((p) => p.plan!));
  const usedLines = (['pure', 'fare-game'] as Line[]).filter((l) => valid.some((p) => p.setting.line === l));

  return (
    <section class="card">
      <div class="no-print">
        <h2>Plan by recipe</h2>
        <div class="row">
          <label>
            Days
            <input
              type="number"
              min="1"
              step="1"
              value={b.days}
              onInput={(e) => update((x) => void (x.modeB.days = Math.max(1, Math.floor(Number(e.currentTarget.value) || 1))))}
            />
          </label>
          <div class="seg" role="group" aria-label="Proportions by">
            <button aria-pressed={b.basis === 'kcal'} onClick={() => update((x) => void (x.modeB.basis = 'kcal'))}>
              Split by calories
            </button>
            <button aria-pressed={b.basis === 'weight'} onClick={() => update((x) => void (x.modeB.basis = 'weight'))}>
              Split by weight
            </button>
          </div>
        </div>
        <p class={assigned === needed ? 'hint' : 'warn'}>
          {assigned} of {needed} containers assigned ({b.days} days × {s.containersPerDay}/day).{' '}
          {assigned !== needed && b.recipes.length > 0 && (
            <button class="link" onClick={() => update((x) => splitEvenly(x.modeB.recipes, x.modeB.days * x.containersPerDay))}>
              Split evenly
            </button>
          )}
        </p>
        {usedLines.map((l) => (
          <DoseWarning target={targets[l]} containersPerDay={s.containersPerDay} update={update} />
        ))}

        {b.recipes.map((r, i) => {
          const options = boughtProducts(s.boughtProductIds, r.line);
          return (
            <div class="recipe">
              <div class="recipe-head">
                <strong>Recipe {LETTERS[i]}</strong>
                <div class="seg" role="group" aria-label="Product line">
                  {(['pure', 'fare-game'] as Line[]).map((line) => (
                    <button
                      aria-pressed={r.line === line}
                      onClick={() =>
                        editRecipe(i, (x) => {
                          if (x.line === line) return;
                          x.line = line;
                          x.items = boughtProducts(s.boughtProductIds, line).slice(0, 2).map((p) => ({ productId: p.id, share: 50 }));
                        })
                      }
                    >
                      {LINE_LABEL[line]}
                    </button>
                  ))}
                </div>
                <label>
                  Containers
                  <input type="number" min="0" step="1" value={r.count} onInput={(e) => editRecipe(i, (x) => void (x.count = Math.max(0, Math.floor(Number(e.currentTarget.value) || 0))))} />
                </label>
                <button class="link danger" onClick={() => update((x) => void x.modeB.recipes.splice(i, 1))}>
                  remove
                </button>
              </div>
              {r.items.map((it, j) => (
                <div class="row item">
                  <select value={it.productId} onChange={(e) => editRecipe(i, (x) => void (x.items[j]!.productId = e.currentTarget.value))}>
                    {options.map((p) => (
                      <option value={p.id}>{shortName(p)}</option>
                    ))}
                  </select>
                  <label>
                    <input type="number" min="0" step="5" value={it.share} onInput={(e) => editRecipe(i, (x) => void (x.items[j]!.share = Math.max(0, Number(e.currentTarget.value) || 0)))} />
                    {b.basis === 'kcal' ? '% of kcal' : '% of weight'}
                  </label>
                  {r.items.length > 1 && (
                    <button class="link danger" onClick={() => editRecipe(i, (x) => void x.items.splice(j, 1))}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {options.length > r.items.length && (
                <button
                  class="link"
                  onClick={() =>
                    editRecipe(i, (x) => {
                      const next = options.find((p) => !x.items.some((it) => it.productId === p.id));
                      if (next) x.items.push({ productId: next.id, share: 50 });
                    })
                  }
                >
                  + add protein
                </button>
              )}
            </div>
          );
        })}
        <button onClick={addRecipe}>+ Add recipe</button>
      </div>

      {valid.length > 0 && (
        <div class="sheet">
          <div class="sheet-head">
            <h2>
              Prep sheet: {valid.reduce((n, p) => n + p.setting.count, 0)} containers
            </h2>
            <PrintButton />
          </div>
          {s.treatsKcal > 0 && (
            <p class="hint">
              Each container leaves room for {Math.round(targets.pure.treatsKcal)} kcal of treats ({s.treatsKcal} kcal/day).
            </p>
          )}
          <div class="cards">
            {planned.map(
              (p, i) =>
                p.plan &&
                p.setting.count > 0 && (
                  <ContainerCard title={`Recipe ${LETTERS[i]}`} count={p.setting.count} portions={p.plan.portions} target={targets[p.setting.line]} />
                ),
            )}
          </div>
          <h3>To thaw</h3>
          <ul class="thaw">
            {thaw.map((t) => (
              <li>
                <strong>{shortName(t.product)}:</strong> {t.grams} g —{' '}
                {t.fullPacks > 0 && `${t.fullPacks} full ${t.product.package.label}${t.fullPacks > 1 ? 's' : ''}`}
                {t.fullPacks > 0 && t.packsToOpen > t.fullPacks && ' + '}
                {t.packsToOpen > t.fullPacks && `${Math.round(t.grams - t.fullPacks * t.product.package.unitGrams)} g from ${t.fullPacks > 0 ? 'another' : 'one'}`}
                {t.leftoverGrams >= 1 && <span class="hint"> ({Math.round(t.leftoverGrams)} g left over)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
