import { logPromotionDebug, logPromotionWarn, truncateForLog } from '../utils/uploadPromotionLog';

const API_BASE = 'https://damecodigo.com';
const PROMOTIONS_API = `${API_BASE}/api/promotions`;
const ANALYZE_IMAGE_API = `${API_BASE}/api/promotions/analyze-image`;

/** URLs del sitio web para redirigir cuando falte algo (ref: assets/docs/upload_promo.md) */
export const SITE_PROMO_URLS = {
  quickPromotion: `${API_BASE}/quick-promotion`,
  addPromotion: `${API_BASE}/add-promotion`,
  createPromotion: `${API_BASE}/create-promotion`,
  promotionDetail: (id: string) => `${API_BASE}/promotion-details/${id}`,
} as const;

export interface ApiPromotionImage {
  originalName?: string;
  filename?: string;
  path?: string;
  url?: string;
  cloudinaryUrl?: string | null;
  uploadedAt?: string;
}

export interface ApiPromotionDoc {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  productName: string;
  brand?: string;
  category?: string;
  originalPrice: number;
  currentPrice: number;
  currency?: string;
  discountPercentage?: number;
  storeName?: string;
  storeLocation?: PromotionStoreLocation;
  isPhysicalStore?: boolean;
  images?: ApiPromotionImage[];
  status?: string;
  validFrom?: string;
  validUntil?: string;
  /** Si es true, al solicitar cupón el backend devuelve redirectToUrl en lugar de QR (ej. SocioFest, Amazon). */
  redirectInsteadOfQr?: boolean;
  /** URL de redirección guardada (puede venir del listado o de GET /api/promotions/:id). */
  redirectToUrl?: string;
  /** Cupón solo si el usuario está dentro del radio respecto al punto de la tienda. */
  gpsActivationEnabled?: boolean;
  locationRadiusMeters?: number;
  /** Si el API devuelve coordenadas planas además de storeLocation. */
  storeLatitude?: number;
  storeLongitude?: number;
  [key: string]: unknown;
}

export interface GetPromotionsParams {
  limit?: number;
  page?: number;
  status?: string;
  category?: string;
}

export interface GetPromotionsResult {
  ok: boolean;
  docs?: ApiPromotionDoc[];
  totalDocs?: number;
  page?: number;
  totalPages?: number;
  error?: string;
}

export function promotionImageUrl(doc: ApiPromotionDoc): string | null {
  const url = doc.images?.[0]?.url;
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
}

export function formatPromotionDate(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export interface PromotionStoreLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  coordinates?: { lat: number; lng: number } | null;
}

/** Respuesta de analyze-image (Gemini), ref: upload_promo.md §4 */
export interface AnalyzeImageData {
  title?: string;
  description?: string;
  productName?: string;
  brand?: string;
  category?: string;
  originalPrice?: number;
  currentPrice?: number;
  discountPercentage?: number;
  offerType?: string;
  cashbackValue?: number | null;
  termsAndConditions?: string;
}

export interface PromotionPayload {
  title: string;
  description?: string;
  productName?: string;
  brand?: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  currency: string;
  discountPercentage?: number;
  offerType?: string;
  cashbackValue?: number | null;
  termsAndConditions?: string;
  totalQuantity?: number;
  storeName?: string;
  storeLocation?: PromotionStoreLocation;
  isPhysicalStore?: boolean;
  validFrom?: string; // ISO
  validUntil?: string; // ISO
  status?: string;
  tags?: string[];
  isHotOffer?: boolean;
  redirectInsteadOfQr?: boolean;
  redirectToUrl?: string;
  /** Cupón solo si el usuario está cerca del punto (tienda); requiere coordenadas y radio. */
  gpsActivationEnabled?: boolean;
  /** Metros; típico 50–50_000. */
  locationRadiusMeters?: number;
}

export interface PromotionImage {
  uri: string;
  name?: string;
  type?: string;
}

/** Coordenadas de tienda desde documento API (anidadas o planas). */
export function getStoreCoordinatesFromDoc(doc: ApiPromotionDoc): { lat: number; lng: number } | null {
  const c = doc.storeLocation?.coordinates;
  if (c?.lat != null && c?.lng != null && Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
    return { lat: c.lat, lng: c.lng };
  }
  const latRaw = doc.storeLatitude ?? (doc as Record<string, unknown>).storeLatitude;
  const lngRaw = doc.storeLongitude ?? (doc as Record<string, unknown>).storeLongitude;
  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw ?? ''));
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw ?? ''));
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

export function isGpsCouponRequired(doc: ApiPromotionDoc): boolean {
  const g = doc.gpsActivationEnabled ?? (doc as Record<string, unknown>).gpsActivationEnabled;
  return g === true || g === 'true';
}

export function getLocationRadiusFromDoc(doc: ApiPromotionDoc): number {
  const r = doc.locationRadiusMeters ?? (doc as Record<string, unknown>).locationRadiusMeters;
  const n = typeof r === 'number' ? r : parseInt(String(r ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return 500;
  return Math.min(Math.max(n, 50), 50_000);
}

/** Cuerpo JSON alineado con POST /api/promotions (sin imágenes). */
function promotionPayloadToJson(data: PromotionPayload): Record<string, unknown> {
  const loc = data.storeLocation;
  const validFrom = data.validFrom ? data.validFrom.split('T')[0] : undefined;
  const validUntil = data.validUntil ? data.validUntil.split('T')[0] : undefined;
  const body: Record<string, unknown> = {
    title: data.title,
    originalPrice: data.originalPrice ?? 0,
    currentPrice: data.currentPrice ?? 0,
    currency: data.currency,
    category: data.category,
    isPhysicalStore: !!data.isPhysicalStore,
  };
  if (data.description) body.description = data.description;
  if (data.productName) body.productName = data.productName;
  if (data.brand) body.brand = data.brand;
  if (data.discountPercentage != null) body.discountPercentage = data.discountPercentage;
  if (data.offerType) body.offerType = data.offerType;
  if (data.cashbackValue != null) body.cashbackValue = data.cashbackValue;
  if (data.termsAndConditions) body.termsAndConditions = data.termsAndConditions;
  if (data.totalQuantity != null) body.totalQuantity = data.totalQuantity;
  if (data.storeName) body.storeName = data.storeName;
  if (loc?.address) body.storeAddress = loc.address;
  if (loc?.city) body.storeCity = loc.city;
  if (loc?.state) body.storeState = loc.state;
  if (loc?.country) body.storeCountry = loc.country;
  if (loc?.coordinates?.lat != null && loc?.coordinates?.lng != null) {
    body.storeLatitude = loc.coordinates.lat;
    body.storeLongitude = loc.coordinates.lng;
  }
  if (data.gpsActivationEnabled) {
    body.gpsActivationEnabled = true;
  }
  if (data.locationRadiusMeters != null && data.gpsActivationEnabled) {
    body.locationRadiusMeters = data.locationRadiusMeters;
  }
  if (validFrom) body.validFrom = validFrom;
  if (validUntil) body.validUntil = validUntil;
  if (data.redirectInsteadOfQr) body.redirectInsteadOfQr = true;
  if (data.redirectToUrl) body.redirectToUrl = data.redirectToUrl;
  if (data.status) body.status = data.status;
  return body;
}

/** Builds FormData with field names expected by POST /api/promotions (title, description, storeCity, etc.) */
function buildPromotionFormData(data: PromotionPayload, images?: PromotionImage[]): FormData {
  const formData = new FormData();
  formData.append('title', data.title);
  if (data.description) formData.append('description', data.description);
  if (data.productName) formData.append('productName', data.productName);
  if (data.brand) formData.append('brand', data.brand);
  if (data.category) formData.append('category', data.category);
  formData.append('originalPrice', String(data.originalPrice ?? 0));
  formData.append('currentPrice', String(data.currentPrice ?? 0));
  if (data.currency) formData.append('currency', data.currency);
  if (data.discountPercentage != null) formData.append('discountPercentage', String(data.discountPercentage));
  if (data.storeName) formData.append('storeName', data.storeName);
  const loc = data.storeLocation;
  if (loc?.address) formData.append('storeAddress', loc.address);
  if (loc?.city) formData.append('storeCity', loc.city);
  if (loc?.state) formData.append('storeState', loc.state);
  if (loc?.country) formData.append('storeCountry', loc.country);
  if (loc?.coordinates?.lat != null && loc?.coordinates?.lng != null) {
    formData.append('storeLatitude', String(loc.coordinates.lat));
    formData.append('storeLongitude', String(loc.coordinates.lng));
  }
  if (data.gpsActivationEnabled) {
    formData.append('gpsActivationEnabled', 'true');
  }
  if (data.locationRadiusMeters != null && data.gpsActivationEnabled) {
    formData.append('locationRadiusMeters', String(data.locationRadiusMeters));
  }
  if (data.validFrom) formData.append('validFrom', data.validFrom.split('T')[0]);
  if (data.validUntil) formData.append('validUntil', data.validUntil.split('T')[0]);
  formData.append('isPhysicalStore', data.isPhysicalStore ? 'true' : 'false');
  if (data.offerType) formData.append('offerType', data.offerType);
  if (data.cashbackValue != null) formData.append('cashbackValue', String(data.cashbackValue));
  if (data.termsAndConditions) formData.append('termsAndConditions', data.termsAndConditions);
  if (data.totalQuantity != null) formData.append('totalQuantity', String(data.totalQuantity));
  if (data.redirectInsteadOfQr) formData.append('redirectInsteadOfQr', 'true');
  if (data.redirectToUrl) formData.append('redirectToUrl', data.redirectToUrl);
  if (data.status) formData.append('status', data.status);
  if (images?.length) {
    images.forEach((img, i) => {
      formData.append('images', {
        uri: img.uri,
        name: img.name ?? `image-${i}.jpg`,
        type: img.type ?? 'image/jpeg',
      } as any);
    });
  }
  return formData;
}

/** Analiza imágenes con IA (Gemini). Ref: upload_promo.md §3. Máx 5 imágenes, campo `images`. */
export async function analyzePromotionImage(
  images: PromotionImage[]
): Promise<{ ok: boolean; data?: AnalyzeImageData; error?: string }> {
  if (!images?.length || images.length > 5) {
    logPromotionWarn('analyzePromotionImage: invalid image count', { count: images?.length ?? 0 });
    return { ok: false, error: 'Se requieren 1–5 imágenes' };
  }
  try {
    logPromotionDebug('analyzePromotionImage:request', { url: ANALYZE_IMAGE_API, count: images.length });
    const formData = new FormData();
    images.forEach((img, i) => {
      formData.append('images', {
        uri: img.uri,
        name: img.name ?? `image-${i}.jpg`,
        type: img.type ?? 'image/jpeg',
      } as any);
    });
    const res = await fetch(ANALYZE_IMAGE_API, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    const success = (json as any).success === true;
    const data = (json as any).data;
    const message = (json as any).message as string | undefined;
    if (!res.ok) {
      return { ok: false, error: message ?? (json as any).error ?? `HTTP ${res.status}` };
    }
    if (!success || !data) {
      logPromotionWarn('analyzePromotionImage: failed', { httpOk: res.ok, success, message });
      return { ok: false, error: message ?? 'Análisis fallido' };
    }
    logPromotionDebug('analyzePromotionImage:ok', { hasData: !!data });
    return { ok: true, data: data as AnalyzeImageData };
  } catch (e: any) {
    logPromotionWarn('analyzePromotionImage:exception', { message: e?.message });
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export async function postPromotion(
  data: PromotionPayload,
  images?: PromotionImage[]
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const hasImages = !!(images && images.length > 0);
    const jsonBody = !hasImages ? promotionPayloadToJson(data) : null;
    logPromotionDebug('postPromotion:request', {
      url: PROMOTIONS_API,
      mode: hasImages ? 'multipart/form-data' : 'application/json',
      imageCount: images?.length ?? 0,
      title: data.title,
      status: data.status,
      currency: data.currency,
      gpsActivationEnabled: data.gpsActivationEnabled ?? false,
      redirectInsteadOfQr: data.redirectInsteadOfQr ?? false,
      jsonKeys: jsonBody ? Object.keys(jsonBody) : undefined,
    });

    const res = await fetch(PROMOTIONS_API, {
      method: 'POST',
      body: hasImages ? buildPromotionFormData(data, images) : JSON.stringify(jsonBody),
      headers: hasImages
        ? { Accept: 'application/json' }
        : { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    const rawText = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      logPromotionWarn('postPromotion:response not JSON', {
        httpStatus: res.status,
        preview: truncateForLog(rawText, 300),
      });
      return {
        ok: false,
        error: res.ok ? 'Respuesta inválida del servidor' : `HTTP ${res.status}`,
      };
    }

    const successFalse = json.success === false;
    const message = typeof json.message === 'string' ? json.message : undefined;
    const errField = typeof json.error === 'string' ? json.error : undefined;

    logPromotionDebug('postPromotion:response', {
      httpStatus: res.status,
      httpOk: res.ok,
      success: json.success,
      hasData: json.data != null,
      message: message ?? null,
      error: errField ?? null,
      id:
        (json.data as Record<string, unknown> | undefined)?.id ??
        (json.data as Record<string, unknown> | undefined)?._id ??
        json.id ??
        null,
    });

    if (__DEV__ && rawText.length > 0) {
      logPromotionDebug('postPromotion:rawBody', {
        truncated: truncateForLog(rawText, 600),
      });
    }

    if (!res.ok) {
      const err = message ?? errField ?? `HTTP ${res.status}`;
      logPromotionWarn('postPromotion:HTTP error', { httpStatus: res.status, err });
      return { ok: false, error: err };
    }

    if (successFalse) {
      const err = message ?? errField ?? 'El servidor rechazó la promoción';
      logPromotionWarn('postPromotion:success=false', { err });
      return { ok: false, error: err };
    }

    return { ok: true, data: json.data ?? json };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logPromotionWarn('postPromotion:exception', { message: msg });
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function getPromotions(params: GetPromotionsParams = {}): Promise<GetPromotionsResult> {
  try {
    const q = new URLSearchParams();
    if (params.limit != null) q.set('limit', String(params.limit));
    if (params.page != null) q.set('page', String(params.page));
    if (params.status) q.set('status', params.status);
    if (params.category) q.set('category', params.category);
    const query = q.toString();
    const url = query ? `${PROMOTIONS_API}?${query}` : PROMOTIONS_API;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    const json = (() => {
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    })();
    if (!res.ok) {
      return { ok: false, error: (json as any).message ?? (json as any).error ?? `HTTP ${res.status}` };
    }
    const data = (json as any).data;
    const docsRaw = data?.docs ?? (json as any).docs ?? data ?? [];
    const docs = Array.isArray(docsRaw) ? docsRaw : [];
    return {
      ok: true,
      docs,
      totalDocs: data?.totalDocs ?? docs.length,
      page: data?.page ?? 1,
      totalPages: data?.totalPages ?? 1,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}
