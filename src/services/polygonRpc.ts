/**
 * Saldo nativo MATIC en Polygon PoS vía RPC público.
 */

const POLYGON_RPC = 'https://polygon-rpc.com';

export async function getMaticBalanceWei(address: string): Promise<string> {
  const res = await fetch(POLYGON_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address.trim(), 'latest'],
      id: 1,
    }),
  });
  const json = await res.json();
  const hex = json?.result;
  if (typeof hex !== 'string') throw new Error('Invalid RPC response');
  return hex;
}

export function weiToMatic(weiHex: string): number {
  const wei = parseInt(weiHex, 16);
  if (Number.isNaN(wei)) return 0;
  return wei / 1e18;
}

export async function getMaticBalance(address: string): Promise<number> {
  try {
    const weiHex = await getMaticBalanceWei(address);
    return weiToMatic(weiHex);
  } catch {
    return 0;
  }
}
