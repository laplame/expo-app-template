/**
 * Saldo XRP (drops) vía JSON-RPC público XRPL.
 */

const XRPL_RPC = 'https://xrplcluster.com';

export async function getXrpBalance(address: string): Promise<number> {
  const account = address.trim();
  if (!account) return 0;
  try {
    const res = await fetch(XRPL_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account, ledger_index: 'validated', strict: true }],
      }),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as {
      result?: { account_data?: { Balance?: string }; error?: string };
    };
    const err = json.result?.error;
    if (err === 'actNotFound' || err === 'actMalformed') return 0;
    const drops = json.result?.account_data?.Balance;
    if (drops == null) return 0;
    const n = Number(drops);
    if (!Number.isFinite(n)) return 0;
    return n / 1e6;
  } catch {
    return 0;
  }
}
