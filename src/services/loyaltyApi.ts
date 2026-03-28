/**
 * Loyalty / punch card: e.g. "5 cafés = 1 gratis".
 * Send state to server for sync and redemption.
 */

const LOYALTY_API = 'https://damecodigo.com/api/loyalty';

export const COFFEE_THRESHOLD = 10;

export interface LoyaltyPayload {
  programId: string;
  punches: number;
  threshold: number;
  userId?: string;
  userName?: string;
  /** Id del café/location preferido; el contador solo es válido ahí. */
  locationId?: string;
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
