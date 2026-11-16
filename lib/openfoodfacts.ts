// Open Food Facts : base collaborative libre de produits alimentaires (appelée depuis le navigateur, sans clé).
import type { MealSource } from './types';

export interface FoodSource {
  name: string;
  brand?: string;
  /** Valeurs pour 100 g. */
  per100: { kcal: number; protein: number; carbs: number; fat: number };
  origin: MealSource;
}

interface RawProduct {
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function toSource(p: RawProduct, origin: MealSource): FoodSource | null {
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  if (kcal === undefined) {
    const kj = num(n['energy_100g']);
    if (kj !== undefined) kcal = kj / 4.184;
  }
  const name = (p.product_name_fr || p.product_name || '').trim();
  if (!name || kcal === undefined || kcal > 950) return null;
  return {
    name: name.slice(0, 80),
    brand: p.brands?.split(',')[0]?.trim().slice(0, 40),
    per100: {
      kcal: Math.round(kcal),
      protein: num(n['proteins_100g']) ?? 0,
      carbs: num(n['carbohydrates_100g']) ?? 0,
      fat: num(n['fat_100g']) ?? 0,
    },
    origin,
  };
}

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchOpenFoodFacts(query: string): Promise<FoodSource[]> {
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10' +
    `&fields=product_name,product_name_fr,brands,nutriments&search_terms=${encodeURIComponent(query)}`;
  const data = (await getJson(url)) as { products?: RawProduct[] } | null;
  return (data?.products ?? []).map((p) => toSource(p, 'recherche')).filter((x): x is FoodSource => x !== null).slice(0, 8);
}

export async function productByBarcode(code: string): Promise<FoodSource | null> {
  if (!/^\d{8,14}$/.test(code)) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_fr,brands,nutriments`;
  const data = (await getJson(url)) as { status?: number; product?: RawProduct } | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return toSource(data.product, 'scanner');
}
