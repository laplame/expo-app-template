/**
 * Obtener saldo BTC de una dirección Bitcoin vía Blockstream Esplora API.
 * Usado en la vista Wallet al tener una dirección Bitcoin añadida manualmente.
 */

const BLOCKSTREAM_API = 'https://blockstream.info/api';

export interface AddressChainStats {
  funded_txo_sum: number;
  spent_txo_sum: number;
  tx_count: number;
}

export async function getBtcBalanceSats(address: string): Promise<number> {
  const res = await fetch(`${BLOCKSTREAM_API}/address/${encodeURIComponent(address.trim())}`);
  if (!res.ok) throw new Error(`BTC API ${res.status}`);
  const data = await res.json();
  const stats: AddressChainStats = data?.chain_stats ?? {};
  const funded = Number(stats.funded_txo_sum ?? 0);
  const spent = Number(stats.spent_txo_sum ?? 0);
  return Math.max(0, funded - spent);
}

export function satsToBtc(sats: number): number {
  return sats / 1e8;
}

export async function getBtcBalance(address: string): Promise<number> {
  try {
    const sats = await getBtcBalanceSats(address);
    return satsToBtc(sats);
  } catch {
    return 0;
  }
}
