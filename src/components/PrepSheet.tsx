import type { Update } from '../app';
import type { ContainerTarget } from '../lib/container';
import { formatAmount } from '../lib/measure';
import type { Portion } from '../lib/recipes';
import { shortName } from '../products';

const r = Math.round;
const suppName = (name: string) => name.replace('Thrive ', '');

/** One container (or a group of identical ones) with grams, supplements and kcal breakdown. */
export function ContainerCard(props: { title: string; count?: number; portions: Portion[]; target: ContainerTarget }) {
  const { portions, target } = props;
  const meat = portions.reduce((s, p) => s + p.kcal, 0);
  const total = meat + target.supplementKcal;
  return (
    <div class="container-card">
      <div class="cc-head">
        <span class="cc-title">{props.title}</span>
        {props.count !== undefined && <span class="cc-count">× {props.count}</span>}
      </div>
      <ul class="cc-items">
        {portions.map((p) => (
          <li>
            <span>{shortName(p.product)}</span>
            <strong>{p.grams} g</strong>
          </li>
        ))}
        {target.supplements.map((s) => (
          <li class="supp-item">
            <span>{suppName(s.supplement.name)}</span>
            <strong>{formatAmount(s.amount, s.supplement.unit)}</strong>
          </li>
        ))}
      </ul>
      <div class="cc-kcal">
        {[
          ...portions.map((p) => `${shortName(p.product)} (${r(p.kcal)} kcal)`),
          ...target.supplements.filter((s) => s.kcal > 0).map((s) => `${suppName(s.supplement.name)} (${r(s.kcal)} kcal)`),
        ].join(' + ')}{' '}
        = <strong>{r(total)} kcal</strong>
      </div>
    </div>
  );
}

export function DoseWarning(props: { target: ContainerTarget; containersPerDay: number; update: Update }) {
  const { target } = props;
  if (target.unmeasurable.length === 0) return null;
  const n = target.suggestedContainersPerDay;
  return (
    <div class="warn">
      With {props.containersPerDay} containers/day,{' '}
      {target.unmeasurable.map((s) => `${suppName(s.supplement.name)} would be ${formatAmount(s.amount, s.supplement.unit)}`).join(' and ')}{' '}
      per container — not something you can measure.{' '}
      <button class="link" onClick={() => props.update((x) => void (x.containersPerDay = n))}>
        Use {n} container{n === 1 ? '' : 's'}/day
      </button>
    </div>
  );
}

export function PrintButton() {
  return (
    <button class="no-print secondary" onClick={() => window.print()}>
      Print prep sheet
    </button>
  );
}
