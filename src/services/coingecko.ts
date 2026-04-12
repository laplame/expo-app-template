/**
 * CoinGecko API - free tier, no API key required for simple/price
 * Docs: https://docs.coingecko.com/reference/simple-price
 */

const BASE_URL = 'https://api.coingecko.com/api/v3';

export type CoinId =
  | 'bitcoin'
  | 'bitcoin-cash'
  | 'wrapped-bitcoin'
  | 'ethereum'
  | 'solana'
  | 'ripple'
  | 'tether'
  | 'matic-network';

export interface CoinPrices {
  bitcoin?: { usd: number };
  'bitcoin-cash'?: { usd: number };
  'wrapped-bitcoin'?: { usd: number };
  ethereum?: { usd: number };
  solana?: { usd: number };
  ripple?: { usd: number };
  tether?: { usd: number };
  /** Precio off-chain / app; token LUXAE; contrato ERC-20 (name) LXD en Polygon */
  luxae?: { usd: number };
  'matic-network'?: { usd: number };
}

const DEFAULT_IDS: CoinId[] = [
  'bitcoin',
  'bitcoin-cash',
  'wrapped-bitcoin',
  'ethereum',
  'solana',
  'ripple',
  'tether',
  'matic-network',
];

export async function getPricesInUsd(ids: CoinId[] = DEFAULT_IDS): Promise<CoinPrices> {
  const idsParam = ids.join(',');
  const res = await fetch(
    `${BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status}`);
  }
  const data = await res.json();
  return data as CoinPrices;
}
