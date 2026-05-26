function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const rawBase = trimTrailingSlash(env || 'https://www.damecodigo.com/api');
  const withWww = rawBase.replace(/^https:\/\/damecodigo\.com(?=\/|$)/i, 'https://www.damecodigo.com');
  return withWww.endsWith('/api') ? withWww : `${withWww}/api`;
}

const API_BASE_URL = getApiBase();

export interface CreateDiscountQrRequest {
  deviceId: string;
  influencerId: string;
  promotionId: string;
  referralCode: string;
  discountPercentage: number;
  walletAddress: string;
  /** Posición del usuario al solicitar el cupón (validación GPS en servidor). */
  clientLatitude?: number;
  clientLongitude?: number;
}

export interface CreateDiscountQrResponse {
  ok: boolean;
  qrValue?: string;
  prefix?: string;
  /** Mismo valor que env / web (`QR_PREFIX`); sin `-N`. */
  basePrefix?: string;
  version?: string;
  ttlSeconds?: number;
  /** Entero 0–100; igual que `discountPercentage` y el `-N` del prefijo (nombre histórico en API). */
  luxaesRedeemed?: number;
  message?: string;
  fallback?: boolean;
  /** Si es true, no hay QR; la app debe redirigir a redirectToUrl (promoción con link). */
  noQr?: boolean;
  /** URL a la que enviar al usuario (ej. SocioFest, Amazon). */
  redirectToUrl?: string;
}

export interface VerifyDiscountQrResponse {
  ok: boolean;
  message?: string;
  couponId?: string;
  payload?: {
    deviceId?: string;
    influencerId?: string;
    promotionId?: string;
    referralCode?: string;
    discountPercentage?: number;
    walletAddress?: string;
  };
  redemption?: {
    redeemable?: boolean;
    usedAt?: string | null;
  };
  data?: Record<string, unknown>;
}

export interface RedeemDiscountQrRequest {
  qrValue: string;
  readerId: string;
  readerDeviceId: string;
  note?: string;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Respaldo offline alineado a la web: con % > 0 el prefijo incluye `-N` y el segmento local
 * reutiliza el código de referido L4D (mismo criterio que CouponRequestForm).
 */
function buildLocalFallbackQr(payload: CreateDiscountQrRequest): string {
  const pct = Math.max(0, Math.min(100, Math.floor(Number(payload.discountPercentage) || 0)));
  const ref = (payload.referralCode ?? '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .trim();
  const refSeg = ref || `P${payload.promotionId}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
  if (pct > 0) {
    return `LINK4DEAL-DISCOUNT-${pct}.local.${refSeg}`;
  }
  return `LINK4DEAL-DISCOUNT.local.${refSeg}`;
}

function shouldFallbackOnBackendError(status: number, message?: string): boolean {
  if (status === 404 || status >= 500) return true;
  const m = (message || '').toLowerCase();
  return m.includes('route') || m.includes('does not exist');
}

function handleCreateResponse(res: Response, json: any, payload: CreateDiscountQrRequest): CreateDiscountQrResponse {
  if (!res.ok) {
    const backendMessage = json?.message ?? `HTTP ${res.status}`;
    if (shouldFallbackOnBackendError(res.status, backendMessage)) {
      const pct = Math.max(0, Math.min(100, Math.floor(Number(payload.discountPercentage) || 0)));
      return {
        ok: true,
        fallback: true,
        qrValue: buildLocalFallbackQr(payload),
        prefix: pct > 0 ? `LINK4DEAL-DISCOUNT-${pct}` : 'LINK4DEAL-DISCOUNT',
        basePrefix: 'LINK4DEAL-DISCOUNT',
        luxaesRedeemed: pct,
        version: 'local',
        ttlSeconds: 120,
        message: 'Error conectando con backend QR. Se mostró un QR local de respaldo.',
      };
    }
    return { ok: false, message: backendMessage };
  }
  const ttl = Number(json?.ttlSeconds ?? 0);
  const lux = json?.luxaesRedeemed;
  return {
    ok: !!json?.ok,
    qrValue: json?.qrValue,
    prefix: json?.prefix,
    basePrefix: typeof json?.basePrefix === 'string' ? json.basePrefix : undefined,
    version: json?.version,
    ttlSeconds: ttl > 0 ? ttl : undefined,
    luxaesRedeemed: (() => {
      const n = Number(lux);
      return Number.isFinite(n) ? n : undefined;
    })(),
    message: json?.message,
    fallback: false,
    noQr: !!json?.noQr,
    redirectToUrl: typeof json?.redirectToUrl === 'string' ? json.redirectToUrl : undefined,
  };
}

export async function createDiscountQrToken(
  payload: CreateDiscountQrRequest
): Promise<CreateDiscountQrResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/discount-qr/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJsonSafe(res);
    return handleCreateResponse(res, json, payload);
  } catch (e: any) {
    const pct = Math.max(0, Math.min(100, Math.floor(Number(payload.discountPercentage) || 0)));
    return {
      ok: true,
      fallback: true,
      qrValue: buildLocalFallbackQr(payload),
      prefix: pct > 0 ? `LINK4DEAL-DISCOUNT-${pct}` : 'LINK4DEAL-DISCOUNT',
      basePrefix: 'LINK4DEAL-DISCOUNT',
      luxaesRedeemed: pct,
      version: 'local',
      ttlSeconds: 120,
      message: 'Error conectando con backend QR. Se mostró un QR local de respaldo.',
    };
  }
}

/** Crear cupón por GET (p. ej. desde enlace o app con query params). Misma respuesta que POST. */
export async function createDiscountQrTokenGet(
  params: CreateDiscountQrRequest
): Promise<CreateDiscountQrResponse> {
  try {
    const q = new URLSearchParams({
      deviceId: params.deviceId,
      influencerId: params.influencerId,
      promotionId: params.promotionId,
      referralCode: params.referralCode,
      discountPercentage: String(params.discountPercentage),
      walletAddress: params.walletAddress,
    });
    if (params.clientLatitude != null) q.set('clientLatitude', String(params.clientLatitude));
    if (params.clientLongitude != null) q.set('clientLongitude', String(params.clientLongitude));
    const res = await fetch(`${API_BASE_URL}/discount-qr/create?${q}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await parseJsonSafe(res);
    return handleCreateResponse(res, json, params);
  } catch (e: any) {
    const pct = Math.max(0, Math.min(100, Math.floor(Number(params.discountPercentage) || 0)));
    return {
      ok: true,
      fallback: true,
      qrValue: buildLocalFallbackQr(params),
      prefix: pct > 0 ? `LINK4DEAL-DISCOUNT-${pct}` : 'LINK4DEAL-DISCOUNT',
      basePrefix: 'LINK4DEAL-DISCOUNT',
      luxaesRedeemed: pct,
      version: 'local',
      ttlSeconds: 120,
      message: 'Error conectando con backend QR. Se mostró un QR local de respaldo.',
    };
  }
}

export async function verifyDiscountQrToken(qrValue: string): Promise<VerifyDiscountQrResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/discount-qr/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ qrValue }),
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) return { ok: false, message: json?.message ?? `HTTP ${res.status}` };
    return {
      ok: !!json?.ok,
      message: json?.message,
      couponId: json?.couponId,
      payload: json?.payload,
      redemption: json?.redemption,
      data: json?.data,
    };
  } catch (e: any) {
    return { ok: false, message: `${e?.message ?? 'Network error'} (${API_BASE_URL})` };
  }
}

export async function redeemDiscountQrToken(
  payload: RedeemDiscountQrRequest
): Promise<{ ok: boolean; message?: string; data?: unknown }> {
  try {
    const res = await fetch(`${API_BASE_URL}/discount-qr/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJsonSafe(res);
    if (!res.ok) return { ok: false, message: json?.message ?? `HTTP ${res.status}`, data: json?.data };
    return { ok: !!json?.ok, message: json?.message, data: json?.data };
  } catch (e: any) {
    return { ok: false, message: `${e?.message ?? 'Network error'} (${API_BASE_URL})` };
  }
}
