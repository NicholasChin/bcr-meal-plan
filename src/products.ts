import raw from './data/products.json';
import type { Line, Product } from './lib/types';

export type CatalogProduct = Product & { url: string; species: string[]; ingredients: string | null };

export const PRODUCTS = raw as unknown as CatalogProduct[];
export const productById = new Map(PRODUCTS.map((p) => [p.id, p]));

export const LINE_LABEL: Record<Line, string> = { pure: 'Pures', 'fare-game': 'Fare Game' };

export function boughtProducts(bought: string[] | null, line?: Line): CatalogProduct[] {
  return PRODUCTS.filter((p) => (bought === null || bought.includes(p.id)) && (!line || p.line === line));
}

/** "Pure Kangaroo" → "Kangaroo" inside a line-specific context. */
export const shortName = (p: Product) => p.name.replace(/^(Pure|Fare Game) /, '');
