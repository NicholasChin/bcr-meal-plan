import { dailyKcal, estimatedKcal, type Update } from '../app';
import { bcsCategory, calorieWeightKg, kgToLb, lbToKg, treatsOverLimit, wsavaRange } from '../lib/energy';
import { formatAmount, type DoseUnit } from '../lib/measure';
import { dosesFor, weightKg, type Settings } from '../lib/settings';
import { defaultDailyDose, getSupplement, SUPPLEMENTS, supplementKcal } from '../lib/supplements';
import { LINE_LABEL, PRODUCTS, shortName } from '../products';

const WSAVA_CHART = 'https://wsava.org/wp-content/uploads/2020/07/Calorie-Needs-for-Healthy-Adult-Cats-updated-July-2020.pdf';
const WSAVA_GUIDE = 'https://wsava.org/global-guidelines/global-nutrition-guidelines/';
const AAHA_2021 =
  'https://www.canadianveterinarians.net/media/iuqg3rfp/cline-2021-aaha-nutrition-and-weight-management-guidelines-for-dogs-and-cats-jaaha-2021.pdf';

const TSP_OPTIONS = Array.from({ length: 24 }, (_, i) => (i + 1) / 8);
const PUMP_OPTIONS = Array.from({ length: 8 }, (_, i) => i + 1);

function AmountSelect(props: { unit: DoseUnit; value: number; onChange: (v: number) => void }) {
  const options = props.unit === 'tsp' ? TSP_OPTIONS : PUMP_OPTIONS;
  const has = options.some((o) => Math.abs(o - props.value) < 1e-9);
  return (
    <select value={String(props.value)} onChange={(e) => props.onChange(Number(e.currentTarget.value))}>
      {!has && <option value={String(props.value)}>{formatAmount(props.value, props.unit)}</option>}
      {options.map((o) => (
        <option value={String(o)}>{formatAmount(o, props.unit).replace(/ \(.*\)$/, '')}</option>
      ))}
    </select>
  );
}

function SupplementPicker(props: {
  label: string;
  kind: 'fortify' | 'oil';
  id: string | null;
  amount: number;
  weightLb: number;
  allowNone: boolean;
  onChange: (id: string | null, amount: number) => void;
}) {
  const options = SUPPLEMENTS.filter((s) => s.kind === props.kind);
  const supp = props.id ? getSupplement(props.id) : null;
  const bcr = supp ? defaultDailyDose(supp.id, props.weightLb) : null;
  const pick = (id: string | null) => {
    if (!id) return props.onChange(null, 0);
    const s = getSupplement(id);
    props.onChange(id, defaultDailyDose(id, props.weightLb) ?? (s.unit === 'tsp' ? 0.25 : 1));
  };
  return (
    <div class="row supp">
      <label>
        {props.label}
        <select value={props.id ?? ''} onChange={(e) => pick(e.currentTarget.value || null)}>
          {props.allowNone && <option value="">None</option>}
          {options.map((s) => (
            <option value={s.id}>{s.name.replace('Thrive ', '')}</option>
          ))}
        </select>
      </label>
      {supp && (
        <>
          <label>
            per day
            <AmountSelect unit={supp.unit} value={props.amount} onChange={(v) => props.onChange(supp.id, v)} />
          </label>
          <span class="hint">
            {bcr !== null ? (
              <>
                BCR label: {formatAmount(bcr, supp.unit)}{' '}
                {Math.abs(bcr - props.amount) > 1e-9 && (
                  <button class="link" onClick={() => props.onChange(supp.id, bcr)}>
                    use
                  </button>
                )}
              </>
            ) : (
              'No dose on BCR label'
            )}
          </span>
        </>
      )}
    </div>
  );
}

export function Profile({ s, update }: { s: Settings; update: Update }) {
  const kg = weightKg(s);
  const lb = kgToLb(kg);
  const estimate = estimatedKcal(s);
  const basisKg = calorieWeightKg(kg, s.bcs);
  const bcs = bcsCategory(s.bcs);
  const range = wsavaRange(s.species, basisKg);
  const fmtWeight = (k: number) => `${+(s.weightUnit === 'kg' ? k : kgToLb(k)).toFixed(1)} ${s.weightUnit}`;
  const hasOilKcal = dosesFor(s, 'pure').some((d) => getSupplement(d.supplementId).fatGramsPerUnit > 0 && d.amount > 0);
  const oilKcal = dosesFor(s, 'pure')
    .map((d) => supplementKcal(getSupplement(d.supplementId), d.amount, s.species))
    .reduce((a, b) => a + b, 0);

  return (
    <section class="card profile">
      <details open>
        <summary>
          <h2>Your cat</h2>
          <span class="summary-line">
            {+s.weight.toFixed(1)} {s.weightUnit} · {dailyKcal(s)} kcal/day · {s.containersPerDay} container
            {s.containersPerDay === 1 ? '' : 's'}/day
          </span>
        </summary>

        <div class="row">
          <label>
            Weight
            <input
              type="number"
              min="0"
              step="0.1"
              value={s.weight}
              onInput={(e) => update((x) => void (x.weight = Number(e.currentTarget.value) || 0))}
            />
          </label>
          <div class="seg" role="group" aria-label="Weight unit">
            {(['lb', 'kg'] as const).map((u) => (
              <button
                aria-pressed={s.weightUnit === u}
                onClick={() =>
                  update((x) => {
                    if (x.weightUnit === u) return;
                    x.weight = +(u === 'kg' ? lbToKg(x.weight) : kgToLb(x.weight)).toFixed(2);
                    x.weightUnit = u;
                  })
                }
              >
                {u}
              </button>
            ))}
          </div>
          <div class="seg" role="group" aria-label="Body type">
            <button aria-pressed={s.bodyType === 'lean'} onClick={() => update((x) => void (x.bodyType = 'lean'))}>
              Lean adult
            </button>
            <button aria-pressed={s.bodyType === 'prone'} onClick={() => update((x) => void (x.bodyType = 'prone'))}>
              Prone to weight gain
            </button>
          </div>
        </div>

        <div class="row">
          <label>
            Body condition score
            <select value={String(s.bcs)} onChange={(e) => update((x) => void (x.bcs = Number(e.currentTarget.value)))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option value={String(n)}>
                  {n}/9{n === 5 ? ' (ideal)' : n === 4 ? ' (ideal, lean)' : n < 4 ? ' (underweight)' : ' (overweight)'}
                </option>
              ))}
            </select>
          </label>
          <span class="hint">
            Score it with the <a href={WSAVA_GUIDE}>WSAVA body condition score chart</a>.
          </span>
        </div>
        {bcs === 'over' && (
          <div class="note">
            At {s.bcs}/9, your cat is about {(s.bcs - 5) * 10}% over ideal weight, so the estimate uses an estimated ideal weight of{' '}
            <strong>{fmtWeight(basisKg)}</strong> instead of {fmtWeight(kg)} (AAHA 2021: each point above 5/9 ≈ 10% overweight). Plan
            any weight loss with your vet — cats shouldn't lose weight quickly.
          </div>
        )}
        {bcs === 'under' && (
          <div class="note">At {s.bcs}/9, your cat is underweight. Check with your vet before changing how much you feed.</div>
        )}

        <div class="row">
          <div>
            Estimated: <strong>{estimate} kcal/day</strong>
            {range && (
              <span class="hint">
                {' '}
                (WSAVA chart for {range.kg} kg: {range.min}–{range.max})
              </span>
            )}
            <div class="hint">
              A starting point only — re-check body condition every few weeks and adjust. Sources:{' '}
              <a href={WSAVA_CHART}>WSAVA calorie chart</a>, <a href={AAHA_2021}>AAHA 2021 guidelines</a>.
            </div>
          </div>
          <label>
            Use kcal/day
            <input
              type="number"
              min="0"
              step="1"
              placeholder={String(estimate)}
              value={s.kcalOverride ?? ''}
              onInput={(e) => {
                const v = e.currentTarget.value;
                update((x) => void (x.kcalOverride = v === '' ? null : Math.max(0, Number(v))));
              }}
            />
          </label>
          {s.kcalOverride !== null && (
            <button class="link" onClick={() => update((x) => void (x.kcalOverride = null))}>
              use estimate
            </button>
          )}
        </div>

        <div class="row">
          <label>
            Treats (kcal/day)
            <input
              type="number"
              min="0"
              step="1"
              value={s.treatsKcal}
              onInput={(e) => update((x) => void (x.treatsKcal = Math.max(0, Number(e.currentTarget.value) || 0)))}
            />
          </label>
          <span class="hint">Subtracted from the daily target, so the food makes up the rest.</span>
        </div>
        {treatsOverLimit(dailyKcal(s), s.treatsKcal) && (
          <div class="warn">
            Treats are {Math.round((s.treatsKcal / dailyKcal(s)) * 100)}% of the day's calories. AAHA recommends keeping treats and
            extras to 10% or less (here, {Math.floor(dailyKcal(s) * 0.1)} kcal) so they don't unbalance the main diet.
          </div>
        )}

        <div class="row">
          <label>
            Containers per day
            <select value={String(s.containersPerDay)} onChange={(e) => update((x) => void (x.containersPerDay = Number(e.currentTarget.value)))}>
              {[1, 2, 3, 4].map((n) => (
                <option value={String(n)}>{n}</option>
              ))}
            </select>
          </label>
          <span class="hint">1 is easiest: mix in the day's supplements, then scoop about half for each meal.</span>
        </div>

        <h3>Supplements for Pure containers</h3>
        <SupplementPicker
          label="Fortify"
          kind="fortify"
          id={s.supplements.pure.fortifyId}
          amount={s.supplements.pure.fortifyAmount}
          weightLb={lb}
          allowNone
          onChange={(id, amount) => update((x) => void Object.assign(x.supplements.pure, { fortifyId: id, fortifyAmount: amount }))}
        />
        <SupplementPicker
          label="Oil"
          kind="oil"
          id={s.supplements.pure.oilId}
          amount={s.supplements.pure.oilAmount}
          weightLb={lb}
          allowNone
          onChange={(id, amount) => update((x) => void Object.assign(x.supplements.pure, { oilId: id, oilAmount: amount }))}
        />

        {hasOilKcal && !s.oilNoteDismissed && (
          <div class="note">
            Your target now includes oil calories. If your current target came from how much your cat has been eating, raise it by
            about {Math.round(oilKcal) || 22} kcal to keep intake the same.{' '}
            <button class="link" onClick={() => update((x) => void (x.oilNoteDismissed = true))}>
              Got it
            </button>
          </div>
        )}

        <h3>Products I buy</h3>
        <div class="bought">
          {(['pure', 'fare-game'] as const).map((line) => (
            <fieldset>
              <legend>{LINE_LABEL[line]}</legend>
              {PRODUCTS.filter((p) => p.line === line).map((p) => {
                const checked = s.boughtProductIds === null || s.boughtProductIds.includes(p.id);
                return (
                  <label class="check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        update((x) => {
                          const cur = x.boughtProductIds ?? PRODUCTS.map((q) => q.id);
                          x.boughtProductIds = checked ? cur.filter((id) => id !== p.id) : [...cur, p.id];
                        })
                      }
                    />
                    {shortName(p)} <span class="hint">{p.kcalPer100g} kcal/100 g</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>
      </details>
    </section>
  );
}
