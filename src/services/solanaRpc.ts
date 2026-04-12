/**
 * Saldo SOL (lamports) vía RPC mainnet-beta.
 */

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

export async function getSolBalance(address: string): Promise<number> {
  const pubkey = address.trim();
  if (!pubkey) return 0;
  try {
    const res = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [pubkey],
      }),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { result?: { value?: number } };
    const lamports = json.result?.value ?? 0;
    if (!Number.isFinite(lamports)) return 0;
    return lamports / 1e9;
  } catch {
    return 0;
  }
}
