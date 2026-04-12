/**
 * Cuerpo JSON recomendado para HTTP 402 + pago off-chain con permit (EIP-2612).
 * El servidor debe devolver este objeto (o equivalente) cuando el recurso requiera pago previo.
 */
export type Http402Eip2612Challenge = {
  scheme: 'eip2612-permit';
  chainId: number;
  token: string;
  name: string;
  version: string;
  spender: string;
  /** Monto en unidades mínimas del token (string decimal, ej. wei-like 6 decimals). */
  value: string;
  /** Si falta, el cliente lo lee del contrato con `nonces(owner)`. */
  nonce?: string;
  deadline: number;
  /** Donde enviar el permit firmado (POST JSON). */
  settleUrl: string;
  /** Método HTTP para liquidar; por defecto POST. */
  settleMethod?: 'POST' | 'PUT';
  /** URL original del recurso (eco para el backend). */
  resource?: string;
  /** Si el servidor devuelve un token tras liquidar, nombre del header en el retry (ej. Authorization). */
  accessHeaderName?: string;
  /** Campos extra que el backend quiera recibir en el POST de liquidación. */
  extra?: Record<string, unknown>;
};

export function isHttp402Eip2612Challenge(x: unknown): x is Http402Eip2612Challenge {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    o.scheme === 'eip2612-permit' &&
    typeof o.chainId === 'number' &&
    typeof o.token === 'string' &&
    typeof o.name === 'string' &&
    typeof o.version === 'string' &&
    typeof o.spender === 'string' &&
    typeof o.value === 'string' &&
    typeof o.deadline === 'number' &&
    typeof o.settleUrl === 'string'
  );
}
