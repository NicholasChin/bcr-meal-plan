import { dailyKcal, type Update } from '../app';
import { containerTarget } from '../lib/container';
import { comboKey, containerTypes, planPackages } from '../lib/packages';
import { dosesFor, type Settings } from '../lib/settings';
import type { Line } from '../lib/types';
import { boughtProducts, LINE_LABEL, productById, shortName } from '../products';
import { ContainerCard, DoseWarning, PrintButton } from './PrepSheet';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function PackagesMode({ s, update }: { s: Settings; update: Update }) {
  const a = s.modeA;
  const products = boughtProducts(s.boughtProductIds, a.line);
  const packsOf = (id: string) => a.stock.find((x) => x.productId === id)?.packs ?? 0;
  const setPacks = (id: string, packs: number) =>
    update((x) => {
      x.modeA.stock = x.modeA.stock.filter((st) => st.productId !== id);
      if (packs > 0) x.modeA.stock.push({ productId: id, packs });
    });

  const stock = a.stock
    .filter((st) => st.packs > 0 && products.some((p) => p.id === st.productId))
    .map((st) => ({ product: productById.get(st.productId)!, packs: st.packs }));
  const N = a.proteinsPerContainer;
  const maxMinPct = Math.floor(100 / N);
  const minPct = Math.min(a.minSharePct, maxMinPct);
  const target = containerTarget({ dailyKcal: dailyKcal(s), containersPerDay: s.containersPerDay, dailyDoses: dosesFor(s, a.line), species: s.species, treatsKcal: s.treatsKcal });
  const types = stock.length >= N ? containerTypes(stock.map((st) => st.product), N) : [];
  const excluded = new Set(a.excludedCombos);
  const allowed = types.filter((t) => !excluded.has(comboKey(t.map((p) => p.id))));
  const result = stock.length
    ? planPackages({
        stock,
        meatKcalPerContainer: target.meatKcal,
        proteinsPerContainer: N,
        minShare: minPct / 100,
        allowedCombos: allowed.length < types.length ? allowed.map((t) => t.map((p) => p.id)) : undefined,
      })
    : null;
  const toggleType = (key: string) =>
    update((x) => {
      const set = new Set(x.modeA.excludedCombos);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      x.modeA.excludedCombos = [...set];
    });

  return (
    <section class="card">
      <div class="no-print">
        <h2>Plan by thawed packages</h2>
        <div class="seg" role="group" aria-label="Product line">
          {(['pure', 'fare-game'] as Line[]).map((line) => (
            <button aria-pressed={a.line === line} onClick={() => update((x) => void (x.modeA.line = line))}>
              {LINE_LABEL[line]}
            </button>
          ))}
        </div>
        <p class="hint">Packages you're thawing ({a.line === 'pure' ? '1 lb packs' : '½ lb portions'}):</p>
        <div class="stock">
          {products.map((p) => (
            <label class="stock-item">
              <span>
                {shortName(p)} <span class="hint">{p.kcalPer100g} kcal/100 g</span>
              </span>
              <input type="number" min="0" step="1" value={packsOf(p.id)} onInput={(e) => setPacks(p.id, Math.max(0, Math.floor(Number(e.currentTarget.value) || 0)))} />
            </label>
          ))}
          {products.length === 0 && <p class="hint">No {LINE_LABEL[a.line]} ticked under "Products I buy".</p>}
        </div>
        <div class="row">
          <label>
            Proteins per container
            <select value={String(N)} onChange={(e) => update((x) => void (x.modeA.proteinsPerContainer = Number(e.currentTarget.value)))}>
              {[1, 2, 3, 4].map((n) => (
                <option value={String(n)}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Minimum share per protein (%)
            <input
              type="number"
              min="0"
              max={maxMinPct}
              step="1"
              value={minPct}
              onInput={(e) => update((x) => void (x.modeA.minSharePct = Math.min(maxMinPct, Math.max(0, Number(e.currentTarget.value) || 0))))}
            />
          </label>
        </div>
        {types.length > 1 && (
          <fieldset class="types">
            <legend>Container types to make</legend>
            {types.map((t) => {
              const key = comboKey(t.map((p) => p.id));
              return (
                <label class="check">
                  <input type="checkbox" checked={!excluded.has(key)} onChange={() => toggleType(key)} />
                  {t.map(shortName).join(' + ')}
                </label>
              );
            })}
          </fieldset>
        )}
        <DoseWarning target={target} containersPerDay={s.containersPerDay} update={update} />
      </div>

      {result && !result.ok && (
        <div class="warn">
          {result.reason === 'mixed-lines' && 'Pures and Fare Game can’t be mixed.'}
          {result.reason === 'too-few-proteins' && `Pick at least ${N} different products for ${N} proteins per container.`}
          {result.reason === 'not-enough-food' && 'Not enough food here for even one container.'}
          {result.reason === 'no-container-types' && 'Tick at least one container type to make.'}
          {result.reason === 'unused-products' &&
            `${result.productIds!.map((id) => shortName(productById.get(id)!)).join(', ')} ${result.productIds!.length === 1 ? "isn't" : "aren't"} in any ticked container type. Tick a type that includes ${result.productIds!.length === 1 ? 'it' : 'them'}, or set ${result.productIds!.length === 1 ? 'its' : 'their'} packs to 0.`}
          {result.reason === 'container-types' &&
            'The ticked container types can’t use up these packages. Tick more container types, change the packs, or plan by recipe instead.'}
          {result.reason === 'min-share' && (
            <>
              These packages are too lopsided for a {minPct}% minimum share. The highest minimum that works is{' '}
              <button class="link" onClick={() => update((x) => void (x.modeA.minSharePct = Math.round(result.maxMinShare! * 100)))}>
                {Math.round(result.maxMinShare! * 100)}%
              </button>
              . Or add a package of another protein, tick more container types, or plan by recipe instead.
            </>
          )}
        </div>
      )}

      {result?.ok && (
        <div class="sheet">
          <div class="sheet-head">
            <h2>
              Prep sheet: {result.containers.length} containers
              <span class="hint">
                {' '}
                (~{+(result.containers.length / s.containersPerDay).toFixed(1)} days at {s.containersPerDay}/day)
              </span>
            </h2>
            <PrintButton />
          </div>
          <p class="hint">
            From {stock.map((st) => `${st.packs}× ${shortName(st.product)}`).join(', ')} · {Math.round(target.meatKcal + target.supplementKcal)} kcal per container
            {target.treatsKcal > 0 && ` (+ ${Math.round(target.treatsKcal)} kcal of treats each = ${Math.round(target.meatKcal + target.supplementKcal + target.treatsKcal)})`}
          </p>
          <div class="cards">
            {result.groups.map((g, i) => (
              <ContainerCard title={`Container ${LETTERS[i] ?? i + 1}`} count={g.count} portions={g.portions} target={target} />
            ))}
          </div>
          {result.groups.length > 1 && (
            <p class="rotation">
              <strong>Rotation order:</strong>{' '}
              {result.containers
                .map((c) => LETTERS[result.groups.findIndex((g) => g.portions === c.portions)])
                .join(' → ')}
            </p>
          )}
          {result.leftover.length > 0 && (
            <p class="totals">
              <strong>Leftover:</strong>{' '}
              {result.leftover.map((l) => `${shortName(l.product)} ${Math.round(l.grams)} g (${Math.round(l.kcal)} kcal)`).join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
