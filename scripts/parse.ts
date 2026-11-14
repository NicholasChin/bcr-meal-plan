// Pure parsing helpers for the BCR data script. No network access here.

export type NutrientValue = { value: number; lessThan?: true } | null;

export function parseNutrientValue(raw: string): NutrientValue {
  const s = raw.trim();
  if (s === '' || s === '-' || /^n\/?a$/i.test(s)) return null;
  const lessThan = s.startsWith('<');
  const n = Number(s.replace(/^</, '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return lessThan ? { value: n, lessThan: true } : { value: n };
}

export function normalizeNutrientName(raw: string): string {
  return raw.replace(/\((?:min|max)\s*-\s*/i, '(').replace(/\s+/g, ' ').trim();
}

export function parseNutrientCsv(csv: string): Record<string, NutrientValue> {
  const out: Record<string, NutrientValue> = {};
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/);
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const [name = '', amount = ''] = line.split(',');
    out[normalizeNutrientName(name)] = parseNutrientValue(amount);
  }
  return out;
}

export function extractCsvPath(html: string): string | null {
  return html.match(/data-csv="([^"]+)"/)?.[1] ?? null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function extractIngredients(html: string): string | null {
  const decoded = decodeEntities(decodeEntities(html));
  const m = decoded.match(/class="prod_ingredients">([\s\S]*?)<\/div>/);
  if (!m?.[1]) return null;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
