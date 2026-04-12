import type { Http402Eip2612Challenge } from '../types/http402Payment';
import { isHttp402Eip2612Challenge } from '../types/http402Payment';
import {
  buildPermitTypedData,
  buildSettleBody,
  typedDataForWalletV4,
} from './eip2612TypedData';
import { readErc20PermitNonce } from './erc20PermitRead';
import { POLYGON_RPC_URL } from '../constants/paidContent';

type Eip1193Request = (args: {
  method: string;
  params?: unknown[];
}) => Promise<unknown>;

export type PaidContent402Result =
  | { ok: true; status: number; body: string; contentType: string | null }
  | { ok: false; error: string };

function parseJson402(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function signTypedDataV4(
  request: Eip1193Request,
  from: string,
  typedData: ReturnType<typeof typedDataForWalletV4>
): Promise<string> {
  const sig = await request({
    method: 'eth_signTypedData_v4',
    params: [from, JSON.stringify(typedData)],
  });
  if (typeof sig !== 'string' || !sig.startsWith('0x')) {
    throw new Error('INVALID_SIGNATURE');
  }
  return sig;
}

/**
 * GET (o el método indicado) al recurso; si responde 402 con desafío EIP-2612,
 * firma permit con la wallet y POST a settleUrl; opcionalmente reintenta el GET con header de acceso.
 */
export async function fetchPaidContentWith402(
  resourceUrl: string,
  init: RequestInit | undefined,
  options: {
    request: Eip1193Request;
    signerAddress: string;
    /** RPC para leer `nonces` si el 402 no trae nonce. */
    rpcUrl?: string;
  }
): Promise<PaidContent402Result> {
  const first = await fetch(resourceUrl, init);
  if (first.status !== 402) {
    const body = await first.text();
    return {
      ok: true,
      status: first.status,
      body,
      contentType: first.headers.get('content-type'),
    };
  }

  const raw402 = await first.text();
  const parsed = parseJson402(raw402);
  if (!isHttp402Eip2612Challenge(parsed)) {
    return {
      ok: false,
      error:
        'HTTP 402 sin desafío eip2612-permit reconocible. El cuerpo debe incluir token, spender, value, deadline, settleUrl.',
    };
  }

  const challenge = parsed as Http402Eip2612Challenge;
  const rpc = options.rpcUrl ?? POLYGON_RPC_URL;

  let nonce: bigint;
  if (challenge.nonce != null && challenge.nonce !== '') {
    nonce = BigInt(challenge.nonce);
  } else {
    try {
      nonce = await readErc20PermitNonce(challenge.token, options.signerAddress, rpc);
    } catch {
      return { ok: false, error: 'No se pudo leer nonces(owner) del token. Revisa red RPC o contrato.' };
    }
  }

  const typed = buildPermitTypedData(challenge, options.signerAddress, nonce);
  const forWallet = typedDataForWalletV4(typed);
  let signatureHex: string;
  try {
    signatureHex = await signTypedDataV4(options.request, options.signerAddress, forWallet);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'sign failed';
    return { ok: false, error: msg };
  }

  const method = (challenge.settleMethod ?? 'POST').toUpperCase();
  const settleBody = buildSettleBody(challenge, options.signerAddress, signatureHex);

  const settleRes = await fetch(challenge.settleUrl, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain, */*' },
    body: JSON.stringify(settleBody),
  });

  const settleText = await settleRes.text();
  if (!settleRes.ok) {
    return {
      ok: false,
      error: `Liquidación fallida: HTTP ${settleRes.status} ${settleText.slice(0, 200)}`,
    };
  }

  let accessToken: string | null = null;
  let headerName = challenge.accessHeaderName ?? 'Authorization';
  try {
    const j = JSON.parse(settleText) as Record<string, unknown>;
    const t =
      (typeof j.accessToken === 'string' && j.accessToken) ||
      (typeof j.token === 'string' && j.token) ||
      (typeof j.paymentReceipt === 'string' && j.paymentReceipt);
    if (t) accessToken = t;
    if (typeof j.accessHeaderName === 'string') headerName = j.accessHeaderName;
    if (typeof j.content === 'string' && j.content) {
      return {
        ok: true,
        status: 200,
        body: j.content,
        contentType: typeof j.contentType === 'string' ? j.contentType : 'text/plain',
      };
    }
  } catch {
    // cuerpo no JSON: puede ser solo el token en texto plano
    if (settleText.length < 500 && !settleText.includes('{')) {
      accessToken = settleText.trim();
    }
  }

  if (accessToken) {
    const h = new Headers(init?.headers);
    h.set(headerName, headerName.toLowerCase() === 'authorization' ? `Bearer ${accessToken}` : accessToken);
    const second = await fetch(resourceUrl, { ...init, headers: h });
    const body = await second.text();
    return {
      ok: true,
      status: second.status,
      body,
      contentType: second.headers.get('content-type'),
    };
  }

  return {
    ok: true,
    status: settleRes.status,
    body: settleText,
    contentType: settleRes.headers.get('content-type'),
  };
}
