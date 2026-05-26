/**
 * Catálogo público BizneAI (shops).
 * Documentación de respuesta: https://bizneai.com/api/shop
 */

import type { PreferredMall } from './storage';

function trimTrailingSlash(u: string): string {
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

export interface BizneAiShop {
  id?: string;
  _id?: string;
  storeName?: string;
  storeLocation?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  storeType?: string;
  fullAddress?: string;
  storeIdentifier?: string;
  status?: string;
  kitchenEnabled?: boolean;
  luxaeEnabled?: boolean;
  menuSystemEnabled?: boolean;
  clientId?: string;
}

export interface BizneAiShopListResponse {
  success?: boolean;
  data?: {
    shops?: BizneAiShop[];
    pagination?: { current?: number; pages?: number; total?: number; limit?: number };
    filters?: { storeTypes?: string[]; cities?: string[]; states?: string[] };
    stats?: Record<string, unknown>;
  };
}

export function getBizneAiShopListUrl(): string {
  const env = process.env.EXPO_PUBLIC_BIZNEAI_SHOP_URL?.trim();
  return trimTrailingSlash(env || 'https://bizneai.com/api/shop');
}

/** IDs BizneAI (prioriza `id` sobre `_id`). */
export function bizneAiShopCanonicalId(shop: BizneAiShop): string {
  return String(shop.id ?? shop._id ?? '').trim();
}

/** Locales extra vía EXPO_PUBLIC_BIZNEAI_CAFE_SUPPLEMENT_JSON (array JSON) si aún no están en /api/shop. */
export function parseBizneCafeSupplementShops(): BizneAiShop[] {
  const raw = process.env.EXPO_PUBLIC_BIZNEAI_CAFE_SUPPLEMENT_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BizneAiShop[]) : [];
  } catch {
    return [];
  }
}

/** Une catálogo remoto con suplemento local/env (sin duplicar id). */
export function mergeBizneShopCatalog(shops: BizneAiShop[]): BizneAiShop[] {
  const merged = [...shops];
  for (const extra of parseBizneCafeSupplementShops()) {
    const id = bizneAiShopCanonicalId(extra);
    if (!id) continue;
    if (!merged.some((s) => bizneAiShopCanonicalId(s) === id)) merged.push(extra);
  }
  return merged;
}

/** ¿Apto para «café preferido» / programa 10=1? */
export function isBizneCafeEligible(shop: BizneAiShop): boolean {
  const st = (shop.storeType || '').toLowerCase();
  const name = (shop.storeName || shop.storeIdentifier || '').toLowerCase();
  if (!bizneAiShopCanonicalId(shop)) return false;
  if (shop.status && shop.status !== 'active') return false;
  if (st.includes('stationery') || st.includes('papeler')) return false;
  if (/coffee|cafe|café|cafeteria|coffeeshop/.test(st)) return true;
  if (/café|cafe|coffee|cafeter/i.test(name)) return true;
  if (st === 'restaurant' && shop.kitchenEnabled && shop.luxaeEnabled) return true;
  return false;
}

/**
 * Sección “cafés” para el programa 10=1: excluye papelería / retail;
 * incluye CoffeeShop, nombre con «café», y restaurantes con cocina + LUXAE.
 */
export function filterBizneAiCafeSectionShops(shops: BizneAiShop[]): BizneAiShop[] {
  return mergeBizneShopCatalog(shops).filter(isBizneCafeEligible);
}

export async function fetchBizneAiShops(): Promise<{ ok: boolean; shops: BizneAiShop[]; error?: string }> {
  try {
    const res = await fetch(getBizneAiShopListUrl(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = (await res.json().catch(() => ({}))) as BizneAiShopListResponse;
    if (!res.ok || json?.success === false) {
      return { ok: false, shops: [], error: `HTTP ${res.status}` };
    }
    const shops = mergeBizneShopCatalog(
      Array.isArray(json?.data?.shops) ? json.data!.shops! : []
    );
    return { ok: true, shops };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, shops: [], error: msg };
  }
}

export function bizneShopToPreferredMall(shop: BizneAiShop): PreferredMall | null {
  const id = bizneAiShopCanonicalId(shop);
  const name = (shop.storeName || '').trim() || (shop.storeIdentifier || '').trim() || id;
  if (!id || !name) return null;
  return {
    id,
    name,
    nameEs: name,
    source: 'bizneai',
    fullAddress: shop.fullAddress,
    bizneStoreType: shop.storeType,
  };
}

/** Preferencia de café para DameCodigo / programa punches (coincide con PreferredMall). */
export interface BizneAiCafeSelectionPayload {
  status: 'selected' | 'cleared';
  shopId?: string;
  shopName?: string;
  storeType?: string;
  deviceId: string;
  programId: 'link4deal_coffee_10_1';
  selectedAt: string;
  fullAddress?: string;
}

/**
 * POST opcional: avisa a BizneAI qué café eligió el usuario para el programa 10 cafés.
 * Configura EXPO_PUBLIC_BIZNEAI_CAFE_STATUS_POST_URL (URL completa); si está vacío, no se llama.
 */
export async function postBizneAiCafePreference(payload: BizneAiCafeSelectionPayload): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.EXPO_PUBLIC_BIZNEAI_CAFE_STATUS_POST_URL?.trim();
  if (!url) return { ok: true };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return {
        ok: false,
        error: (json as any)?.message ?? (json as any)?.error ?? `HTTP ${res.status}`,
      };
    }
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
