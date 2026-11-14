// Re-downloads BCR product pages + nutrient CSVs and writes src/data/products.json.
// Run by hand when BCR changes products:  npm run fetch-data
import { writeFileSync } from 'node:fs';
import { extractCsvPath, extractIngredients, parseNutrientCsv } from './parse';

const BASE = 'https://bigcountryraw.ca';
const LB = 453.6;

type Line = 'pure' | 'fare-game';
const CATALOG: { slug: string; name: string; line: Line }[] = [
  { slug: 'fare-game-chicken-and-beef-2-lb', name: 'Fare Game Chicken & Beef', line: 'fare-game' },
  { slug: 'fare-game-chicken-salmon-and-beef-2-lb', name: 'Fare Game Chicken, Salmon & Beef', line: 'fare-game' },
  { slug: 'fare-game-kangaroo-and-lamb-2-lb', name: 'Fare Game Kangaroo & Lamb', line: 'fare-game' },
  { slug: 'fare-game-quail-duck-and-lamb-recipe-2-lb', name: 'Fare Game Quail, Duck & Lamb', line: 'fare-game' },
  { slug: 'fare-game-rabbit-and-pork-2-lb', name: 'Fare Game Rabbit & Pork', line: 'fare-game' },
  { slug: 'fare-game-turkey-sardine-and-beef-2-lb', name: 'Fare Game Turkey, Sardine & Beef', line: 'fare-game' },
  { slug: 'pure-beef-carton-4-lb', name: 'Pure Beef', line: 'pure' },
  { slug: 'pure-chicken-carton-4-lb', name: 'Pure Chicken', line: 'pure' },
  { slug: 'pure-duck-carton-4-lb', name: 'Pure Duck', line: 'pure' },
  { slug: 'pure-kangaroo-carton-4-lb', name: 'Pure Kangaroo', line: 'pure' },
  { slug: 'pure-lamb-carton-4-lb', name: 'Pure Lamb', line: 'pure' },
  { slug: 'pure-pork-carton-4-lb', name: 'Pure Pork', line: 'pure' },
  { slug: 'pure-rabbit-carton-4-lb', name: 'Pure Rabbit', line: 'pure' },
  { slug: 'pure-turkey-carton-4-lb', name: 'Pure Turkey', line: 'pure' },
];

const PACKAGE = {
  pure: { unitGrams: LB, label: '1 lb pack' },
  'fare-game': { unitGrams: LB / 2, label: '½ lb portion' },
};

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (bcr-meal-plan data script)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

const products = [];
for (const p of CATALOG) {
  const url = `${BASE}/${p.slug}/`;
  const html = await get(url);
  const csvPath = extractCsvPath(html);
  if (!csvPath) throw new Error(`${p.slug}: no nutrient CSV found`);
  const nutrients = parseNutrientCsv(await get(BASE + csvPath));
  const kcal = nutrients['Calories (kcal)'];
  if (!kcal) throw new Error(`${p.slug}: CSV has no calories`);
  products.push({
    id: p.slug.replace(/-(carton-4-lb|recipe-2-lb|2-lb)$/, ''),
    name: p.name,
    url,
    species: p.line === 'pure' ? ['cat', 'dog'] : ['cat'],
    line: p.line,
    complete: p.line === 'fare-game',
    kcalPer100g: kcal.value,
    package: PACKAGE[p.line],
    ingredients: extractIngredients(html),
    nutrients,
  });
  console.log(`${p.name}: ${kcal.value} kcal/100g`);
}

writeFileSync(new URL('../src/data/products.json', import.meta.url), JSON.stringify(products, null, 2) + '\n');
console.log(`Wrote ${products.length} products.`);
