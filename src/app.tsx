import { useEffect, useState } from 'preact/hooks';
import { calorieWeightKg, estimateDailyKcal } from './lib/energy';
import { parseSettings, STORAGE_KEY, weightKg, type Settings } from './lib/settings';
import { Profile } from './components/Profile';
import { PackagesMode } from './components/PackagesMode';
import { DaysMode } from './components/DaysMode';

export type Update = (fn: (s: Settings) => void) => void;

/** Estimate from weight — or from estimated ideal weight when body condition is over 5/9. */
export function estimatedKcal(s: Settings): number {
  return Math.round(estimateDailyKcal(s.species, calorieWeightKg(weightKg(s), s.bcs), s.bodyType));
}

export function dailyKcal(s: Settings): number {
  return s.kcalOverride ?? estimatedKcal(s);
}

export function App() {
  const [settings, setSettings] = useState<Settings>(() => parseSettings(localStorage.getItem(STORAGE_KEY)));
  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)), [settings]);

  const update: Update = (fn) =>
    setSettings((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  return (
    <main>
      <header class="no-print">
        <h1>BCR Meal Planner</h1>
        <p class="sub">Portions for batch-prepping Big Country Raw Pures and Fare Game.</p>
      </header>
      <Profile s={settings} update={update} />
      <nav class="tabs no-print" role="tablist">
        <button role="tab" aria-selected={settings.tab === 'packages'} onClick={() => update((s) => void (s.tab = 'packages'))}>
          Plan by thawed packages
        </button>
        <button role="tab" aria-selected={settings.tab === 'days'} onClick={() => update((s) => void (s.tab = 'days'))}>
          Plan by recipe
        </button>
      </nav>
      {settings.tab === 'packages' ? <PackagesMode s={settings} update={update} /> : <DaysMode s={settings} update={update} />}
      <footer class="no-print">
        Calorie estimate: NRC 2006 via{' '}
        <a href="https://wsava.org/global-guidelines/global-nutrition-guidelines/">WSAVA</a>. Body condition and treats:{' '}
        <a href="https://www.canadianveterinarians.net/media/iuqg3rfp/cline-2021-aaha-nutrition-and-weight-management-guidelines-for-dogs-and-cats-jaaha-2021.pdf">AAHA 2021</a>. Oil calories: fat × 8.5 kcal/g
        (cats), per{' '}
        <a href="https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025.pdf">
          FEDIAF 2025
        </a>
        . Product data from <a href="https://bigcountryraw.ca/">bigcountryraw.ca</a>. Not veterinary advice.
      </footer>
    </main>
  );
}
