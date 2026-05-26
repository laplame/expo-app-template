/**
 * Loyalty / punch card: e.g. "10 cafés = 1 gratis".
 * Send state to server for sync and redemption.
 */

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const rawBase = trimTrailingSlash(env || 'https://www.damecodigo.com/api');
  const withWww = rawBase.replace(/^https:\/\/damecodigo\.com(?=\/|$)/i, 'https://www.damecodigo.com');
  return withWww.endsWith('/api') ? withWww : `${withWww}/api`;
}

const API_BASE_URL = getApiBase();
const LOYALTY_API = `${API_BASE_URL}/loyalty`;
const COFFEE_LOYALTY_API = `${LOYALTY_API}/coffee`;

export const COFFEE_THRESHOLD = 10;

export interface LoyaltyLocation {
  id: string;
  name: string;
  nameEs?: string;
  address?: string;
  addressEs?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
}

export interface LoyaltyPayload {
  programId: string;
  punches: number;
  threshold: number;
  userId?: string;
  userName?: string;
  /** Id del café/location preferido; el contador solo es válido ahí. */
  locationId?: string;
}

export interface CoffeeLoyaltyTransactionPayload {
  deviceId: string;
  userName?: string;
  cafeId: string;
  cafeName: string;
  cafeNameEs?: string;
  transactionId: string;
  transactionType: 'qr_presented' | 'purchase_confirmed' | 'free_coffee_redeemed';
  punchesBefore: number;
  threshold: number;
  qrValue: string;
  occurredAt: string;
  location: LoyaltyLocation;
  metadata?: Record<string, unknown>;
}

export interface CoffeeLoyaltyState {
  ok: boolean;
  punches?: number;
  threshold?: number;
  freeCoffeesAvailable?: number;
  transactions?: unknown[];
  error?: string;
}

export async function sendLoyaltyToServer(payload: LoyaltyPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(LOYALTY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: (json as any).message ?? (json as any).error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export async function postCoffeeLoyaltyTransaction(
  payload: CoffeeLoyaltyTransactionPayload
): Promise<{ ok: boolean; punches?: number; freeCoffeesAvailable?: number; error?: string }> {
  try {
    const res = await fetch(`${COFFEE_LOYALTY_API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.message ?? json?.error ?? `HTTP ${res.status}` };
    }
    const data = json?.data ?? json;
    return {
      ok: true,
      punches: typeof data?.punches === 'number' ? data.punches : undefined,
      freeCoffeesAvailable:
        typeof data?.freeCoffeesAvailable === 'number' ? data.freeCoffeesAvailable : undefined,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export async function getCoffeeLoyaltyState(params: {
  deviceId: string;
  cafeId: string;
}): Promise<CoffeeLoyaltyState> {
  try {
    const q = new URLSearchParams({
      deviceId: params.deviceId,
      cafeId: params.cafeId,
    });
    const res = await fetch(`${COFFEE_LOYALTY_API}?${q.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.message ?? json?.error ?? `HTTP ${res.status}` };
    }
    const data = json?.data ?? json;
    return {
      ok: true,
      punches: typeof data?.punches === 'number' ? data.punches : undefined,
      threshold: typeof data?.threshold === 'number' ? data.threshold : undefined,
      freeCoffeesAvailable:
        typeof data?.freeCoffeesAvailable === 'number' ? data.freeCoffeesAvailable : undefined,
      transactions: Array.isArray(data?.transactions) ? data.transactions : undefined,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}
