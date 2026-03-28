/**
 * Obtener saldo ETH de una dirección EVM vía RPC público.
 * Usado en la vista Wallet al tener una dirección conectada (MetaMask o manual).
 */

const ETH_RPC = 'https://eth.llamarpc.com';

export async function getEthBalanceWei(address: string): Promise<string> {
  const res = await fetch(ETH_RPC, {
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

export function weiToEth(weiHex: string): number {
  const wei = parseInt(weiHex, 16);
  if (Number.isNaN(wei)) return 0;
  return wei / 1e18;
}

export async function getEthBalance(address: string): Promise<number> {
  try {
    const weiHex = await getEthBalanceWei(address);
    return weiToEth(weiHex);
  } catch {
    return 0;
  }
}
