/**
 * Saldo BCH vía Blockchair (dashboards/address).
 */

const BASE = 'https://api.blockchair.com/bitcoin-cash/dashboards/address';

export async function getBchBalance(address: string): Promise<number> {
  const a = address.trim();
  if (!a) return 0;
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(a)}`);
    if (!res.ok) return 0;
    const json = (await res.json()) as {
      data?: Record<string, { address?: { balance?: number } }>;
    };
    const d = json.data;
    if (!d || typeof d !== 'object') return 0;
    const node = d[a] ?? Object.values(d)[0];
    const sat = Number(node?.address?.balance ?? 0);
    if (!Number.isFinite(sat)) return 0;
    return sat / 1e8;
  } catch {
    return 0;
  }
}
