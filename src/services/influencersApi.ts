/**
 * API de influencers (Gemini + backend).
 * Ref: assets/docs/buscarInfluencers.md
 *
 * Base URL (igual que en commits previos del repo): `EXPO_PUBLIC_API_URL` sin barra final,
 * o por defecto `https://www.damecodigo.com/api`. Rutas: `/influencers`, `/influencers/avatar`,
 * `/analyze-profile-image`. No se ha cambiado la construcción de URLs; un 502 viene del
 * servidor/proxy, no de esta capa.
 *
 * Convención: EXPO_PUBLIC_API_URL debe incluir `/api` al final (ej. https://damecodigo.com/api).
 */
import { formatHttpApiError } from '../utils/formatHttpApiError';

function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.endsWith('/') ? env.slice(0, -1) : env;
  return 'https://www.damecodigo.com/api';
}
const API_BASE = getApiBase();
const INFLUENCERS_API = `${API_BASE}/influencers`;
const INFLUENCERS_AVATAR_API = `${API_BASE}/influencers/avatar`;
const ANALYZE_PROFILE_API = `${API_BASE}/analyze-profile-image`;

/** Resuelve URL de imagen: si es relativa (/uploads/...), la convierte en absoluta. */
export function resolveInfluencerImageUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const t = url.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const base = API_BASE.replace(/\/api\/?$/, '');
  return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}

export type InfluencerPlatform = 'youtube' | 'tiktok' | 'instagram';

export interface InfluencerAnalyzeData {
  displayName?: string;
  bio?: string;
  location?: string;
  categories?: string[];
  socialMedia?: {
    platform?: string;
    username?: string;
    url?: string;
    followers?: number;
  }[];
}

/** followers por plataforma (backend: instagram, tiktok, youtube, twitter) */
export interface InfluencerFollowers {
  instagram?: number;
  tiktok?: number;
  youtube?: number;
  twitter?: number;
}

/** socialMedia puede venir como array o como objeto {instagram, tiktok, youtube, twitter} */
export type InfluencerSocialMedia =
  | { platform?: string; username?: string; url?: string }[]
  | Record<string, string>;

export interface InfluencerDoc {
  _id?: string;
  id?: string;
  /** Slug en la URL web: /influencer/{publicSlug} — ej. luccylamademoiselita */
  publicSlug?: string;
  /** Handle del API (suele coincidir con publicSlug) */
  username?: string;
  /** Código corto de cupón/campaña (ej. DNF9YTP2), NO es el slug de la página */
  profileShortCode?: string;
  influencerProfileShortCode?: string;
  displayName?: string;
  name?: string;
  bio?: string;
  location?: string;
  categories?: string[];
  socialMedia?: InfluencerSocialMedia;
  /** URL de foto (API devuelve `avatar`; legacy `profileImageUrl`) */
  profileImageUrl?: string;
  avatar?: string;
  /** Total de seguidores (backend) */
  totalFollowers?: number;
  /** Seguidores por plataforma */
  followers?: InfluencerFollowers;
  recentPromotions?: InfluencerRecentPromotion[];
  recentPayments?: unknown[];
  couponStats?: InfluencerCouponStats;
  redeemedCoupons?: number;
  activePromotions?: number;
  completedPromotions?: number;
  [key: string]: unknown;
}

export interface InfluencerRecentPromotion {
  id?: string;
  _id?: string;
  title?: string;
  brand?: string;
  date?: string;
  status?: string;
  earnings?: number;
  couponUsage?: number;
  totalSales?: number;
  couponCode?: string;
}

export interface InfluencerCouponStats {
  totalCoupons?: number;
  activeCoupons?: number;
  totalSales?: number;
  totalCommission?: number;
  averageConversion?: number;
}

export interface CreateInfluencerPayload {
  displayName: string;
  bio?: string;
  location?: string;
  /** Backend recibe collaborationPreferences, lo mapea a categories */
  collaborationPreferences?: string[];
  categories?: string[];
  socialMedia?: {
    platform?: string;
    username?: string;
    url?: string;
    followers?: number;
    verified?: boolean;
  }[];
  /** URL del avatar (viene de POST /api/influencers/avatar). Ref: buscarInfluencers.md §6 */
  avatar?: string;
}

/**
 * Sube foto de perfil al backend.
 * POST /api/influencers/avatar
 * Body: multipart/form-data, campo "avatar" (Multer).
 * Opcional: Authorization: Bearer <token>.
 * Prod: https://damecodigo.com/api/influencers/avatar
 * Local: http://localhost:3000/api/influencers/avatar
 */
export async function uploadInfluencerAvatar(
  imageUri: string,
  options?: { authToken?: string }
): Promise<{ ok: boolean; avatarUrl?: string; error?: string }> {
  try {
    const uri = normalizeImageUri(imageUri);
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
    const formData = new FormData();
    formData.append('avatar', {
      uri,
      name: filename,
      type: mimeType,
    } as any);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options?.authToken) headers['Authorization'] = `Bearer ${options.authToken}`;
    const res = await fetch(INFLUENCERS_AVATAR_API, {
      method: 'POST',
      body: formData,
      headers,
    });
    const json = await res.json().catch(() => ({}));
    const success = (json as any).success === true;
    const avatarUrl = (json as any).data?.avatarUrl;
    if (!res.ok) {
      const fallback = (json as any).message ?? (json as any).error ?? `HTTP ${res.status}`;
      return {
        ok: false,
        error: formatHttpApiError(res.status, fallback),
      };
    }
    if (!success || !avatarUrl) {
      return { ok: false, error: (json as any).message ?? 'Upload fallido' };
    }
    const base = API_BASE.replace(/\/api\/?$/, '');
    const resolved = typeof avatarUrl === 'string' && avatarUrl.startsWith('/')
      ? `${base}${avatarUrl}`
      : avatarUrl;
    return { ok: true, avatarUrl: resolved };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

/**
 * Normaliza URI de imagen para FormData (Android puede fallar con content:// o file:/ mal formado).
 */
function normalizeImageUri(uri: string): string {
  if (!uri) return uri;
  if (uri.startsWith('file:/') && !uri.startsWith('file:///')) {
    return uri.replace('file:/', 'file:///');
  }
  return uri;
}

/** Analiza screenshot de perfil con Gemini (type=influencer). */
export async function analyzeProfileImage(
  image: { uri: string; name?: string; type?: string }
): Promise<{ ok: boolean; data?: InfluencerAnalyzeData; error?: string }> {
  try {
    const formData = new FormData();
    const uri = normalizeImageUri(image.uri);
    const mimeType = image.type && image.type.includes('/') ? image.type : 'image/jpeg';
    formData.append('image', {
      uri,
      name: image.name ?? 'profile.jpg',
      type: mimeType,
    } as any);
    formData.append('type', 'influencer');

    const res = await fetch(ANALYZE_PROFILE_API, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
      // No establecer Content-Type: fetch lo genera con boundary para multipart
    });
    const json = await res.json().catch(() => ({}));
    const success = (json as any).success === true;
    const data = (json as any).data;

    if (!res.ok) {
      const fallback =
        (json as any).message ?? (json as any).error ?? `HTTP ${res.status}`;
      return {
        ok: false,
        error: formatHttpApiError(res.status, fallback),
      };
    }
    if (!success || !data) {
      return {
        ok: false,
        error: (json as any).message ?? 'Análisis fallido',
      };
    }
    return { ok: true, data: data as InfluencerAnalyzeData };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

/** Perfil del influencer vinculado al usuario (GET /api/influencers/me). Requiere JWT. */
export async function getInfluencerMe(accessToken: string): Promise<{
  ok: boolean;
  data?: InfluencerDoc;
  error?: string;
  code?: string;
}> {
  try {
    const res = await fetch(`${INFLUENCERS_API}/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    });
    const json = await res.json().catch(() => ({}));
    const message =
      (json as { message?: string }).message ??
      (json as { error?: string }).error;
    const code = typeof (json as { code?: string }).code === 'string'
      ? (json as { code: string }).code
      : undefined;
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code,
      };
    }
    const raw = (json as { data?: InfluencerDoc }).data ?? json;
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: message ?? 'Sin datos de perfil' };
    }
    return { ok: true, data: normalizeInfluencerDoc(raw as InfluencerDoc) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

/** Obtiene todos los influencers (GET /api/influencers). */
export async function getAllInfluencers(params?: {
  limit?: number;
  page?: number;
}): Promise<{
  ok: boolean;
  influencers?: InfluencerDoc[];
  totalDocs?: number;
  error?: string;
}> {
  try {
    const sp = new URLSearchParams();
    if (params?.limit != null) sp.set('limit', String(params.limit));
    if (params?.page != null) sp.set('page', String(params.page));
    const query = sp.toString();
    const url = query ? `${INFLUENCERS_API}?${query}` : INFLUENCERS_API;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const fallback = (json as any).message ?? (json as any).error ?? `HTTP ${res.status}`;
      return {
        ok: false,
        error: formatHttpApiError(res.status, fallback),
      };
    }
    const data = (json as any).data;
    const list = Array.isArray(data) ? data : (data?.docs ?? (json as any).influencers ?? []);
    const arr = Array.isArray(list) ? list : [];
    const deduped = deduplicateInfluencers(arr as InfluencerDoc[]).map(normalizeInfluencerDoc);
    const totalDocs = data?.totalDocs ?? (json as any).totalDocs ?? deduped.length;
    return { ok: true, influencers: deduped, totalDocs };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

/** Deduplica influencers por id; si no hay id, por nombre + primer username normalizados */
export function deduplicateInfluencers(list: InfluencerDoc[]): InfluencerDoc[] {
  const seen = new Set<string>();
  return list.filter((inf) => {
    const id = inf._id ?? inf.id ?? '';
    if (id && seen.has(id)) return false;
    if (id) {
      seen.add(id);
      return true;
    }
    const name = (inf.displayName ?? inf.name ?? '').toString().toLowerCase().trim();
    const sm = inf.socialMedia;
    let firstUser = '';
    if (sm && !Array.isArray(sm)) {
      firstUser = Object.values(sm as Record<string, string>).find((v) => (v ?? '').trim()) ?? '';
    } else if (Array.isArray(sm)) {
      firstUser = (sm[0]?.username ?? sm[0]?.url ?? '').toString().toLowerCase();
    }
    const key = `${name}|${firstUser.replace(/^@/, '')}`;
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });
}

/** Busca influencers por query y plataforma (GET /api/influencers). */
export async function searchInfluencers(params: {
  q: string;
  platform?: InfluencerPlatform;
  limit?: number;
}): Promise<{
  ok: boolean;
  influencers?: InfluencerDoc[];
  error?: string;
}> {
  try {
    const sp = new URLSearchParams();
    sp.set('q', params.q.trim());
    if (params.platform) sp.set('platform', params.platform);
    if (params.limit != null) sp.set('limit', String(params.limit));
    const url = `${INFLUENCERS_API}?${sp.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));

    if (res.status === 404) {
      return { ok: true, influencers: [] };
    }
    if (!res.ok) {
      const fallback =
        (json as any).message ?? (json as any).error ?? `HTTP ${res.status}`;
      return {
        ok: false,
        error: formatHttpApiError(res.status, fallback),
      };
    }

    const data = (json as any).data;
    const list = Array.isArray(data)
      ? data
      : (data?.docs ?? (json as any).influencers ?? []);
    const arr = Array.isArray(list) ? list : [];
    const deduped = deduplicateInfluencers(arr as InfluencerDoc[]).map(normalizeInfluencerDoc);
    return { ok: true, influencers: deduped };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

/** Normaliza documento del listado GET /api/influencers (name, username, publicSlug). */
export function normalizeInfluencerDoc(raw: InfluencerDoc): InfluencerDoc {
  const doc = { ...raw };
  if (!doc._id && doc.id) doc._id = doc.id;
  if (!doc.id && doc._id) doc.id = doc._id;
  if (!doc.displayName && typeof doc.name === 'string') {
    doc.displayName = doc.name;
  }
  const record = doc as Record<string, unknown>;
  if (!doc.publicSlug && typeof record.public_slug === 'string') {
    doc.publicSlug = record.public_slug;
  }
  if (!doc.username && typeof record.userName === 'string') {
    doc.username = record.userName;
  }
  return doc;
}

/** Interpreta cuerpos variados de POST /influencers (data, influencer o documento en raíz). */
export function parseInfluencerCreateBody(json: unknown): InfluencerDoc | undefined {
  if (!json || typeof json !== 'object') return undefined;
  const j = json as Record<string, unknown>;
  let raw: unknown = j.data ?? j.influencer;
  if (raw == null && (j._id != null || j.id != null)) raw = j;
  if (!raw || typeof raw !== 'object') return undefined;
  return normalizeInfluencerDoc(raw as InfluencerDoc);
}

function isLikelyDuplicateInfluencerError(message: string, status: number): boolean {
  if (status === 409 || status === 422) return true;
  const m = String(message || '').toLowerCase();
  return /duplicate|already exist|ya existe|e11000|already registered|registrado|unique/i.test(m);
}

/**
 * Crea influencer (POST /api/influencers). Ref: buscarInfluencers.md §4
 *
 * Respuesta esperada (web): `{ success: true, data: { ... } }`. Se mantiene compatibilidad
 * con ese contrato; además se aceptan variantes (documento en raíz, `influencer`, etc.).
 */
export async function createInfluencer(
  payload: CreateInfluencerPayload,
  options?: { authToken?: string }
): Promise<{ ok: boolean; data?: InfluencerDoc; error?: string; duplicate?: boolean }> {
  try {
    const body = {
      displayName: payload.displayName.trim(),
      bio: payload.bio?.trim() || undefined,
      location: payload.location?.trim() || undefined,
      collaborationPreferences: payload.collaborationPreferences ?? payload.categories ?? undefined,
      socialMedia: payload.socialMedia?.map((s) => ({
        platform: s.platform ?? 'Instagram',
        username: (s.username ?? '').trim() || undefined,
        followers: s.followers,
        verified: s.verified ?? false,
      })),
      avatar: payload.avatar || undefined,
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (options?.authToken?.trim()) {
      headers.Authorization = `Bearer ${options.authToken.trim()}`;
    }
    const res = await fetch(INFLUENCERS_API, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    const msg =
      (json as any).message ?? (json as any).error ?? (typeof (json as any).msg === 'string' ? (json as any).msg : '');
    const errText = msg ? String(msg) : `HTTP ${res.status}`;

    if (!res.ok) {
      const friendly = formatHttpApiError(res.status, errText);
      return {
        ok: false,
        error: friendly,
        duplicate: isLikelyDuplicateInfluencerError(errText, res.status),
      };
    }

    // 1) Formato flexible (raíz / data / influencer). 2) Mismo criterio que la versión previa: json.data
    const data =
      parseInfluencerCreateBody(json) ?? ((json as any).data != null && typeof (json as any).data === 'object'
        ? ({ ...(json as any).data } as InfluencerDoc)
        : undefined);
    if (data && !data.displayName && typeof (data as { name?: string }).name === 'string') {
      data.displayName = (data as { name: string }).name;
    }

    const successFlag = (json as any).success;
    // Como la versión previa: success === false implica fallo (no devolver documento aunque venga algo raro en data)
    if (successFlag === false) {
      return {
        ok: false,
        error: (json as any).message ?? (errText || 'Creación fallida'),
        duplicate: isLikelyDuplicateInfluencerError(errText, res.status),
      };
    }
    if (data) {
      return { ok: true, data: normalizeInfluencerDoc(data) };
    }
    // Versión previa exigía success === true; aquí success true sin cuerpo parseable
    if (successFlag === true) {
      return {
        ok: false,
        error: errText || 'La API no devolvió los datos del influencer',
      };
    }
    return {
      ok: false,
      error: (json as any).message ?? (errText || 'Creación fallida'),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}
