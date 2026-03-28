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
}

export interface PromotionImage {
  uri: string;
  name?: string;
  type?: string;
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
  if (data.validFrom) formData.append('validFrom', data.validFrom.split('T')[0]);
  if (data.validUntil) formData.append('validUntil', data.validUntil.split('T')[0]);
  formData.append('isPhysicalStore', data.isPhysicalStore ? 'true' : 'false');
  if (data.offerType) formData.append('offerType', data.offerType);
  if (data.cashbackValue != null) formData.append('cashbackValue', String(data.cashbackValue));
  if (data.termsAndConditions) formData.append('termsAndConditions', data.termsAndConditions);
  if (data.totalQuantity != null) formData.append('totalQuantity', String(data.totalQuantity));
  if (data.redirectInsteadOfQr) formData.append('redirectInsteadOfQr', 'true');
  if (data.redirectToUrl) formData.append('redirectToUrl', data.redirectToUrl);
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
    return { ok: false, error: 'Se requieren 1–5 imágenes' };
  }
  try {
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
      return { ok: false, error: message ?? 'Análisis fallido' };
    }
    return { ok: true, data: data as AnalyzeImageData };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
  }
}

export async function postPromotion(
  data: PromotionPayload,
  images?: PromotionImage[]
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const formData = buildPromotionFormData(data, images);
    const res = await fetch(PROMOTIONS_API, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' },
    });
    const json = await res.json().catch(() => ({}));
    const success = (json as any).success === true;
    const message = (json as any).message as string | undefined;
    if (!res.ok) {
      return { ok: false, error: message ?? (json as any).error ?? `HTTP ${res.status}` };
    }
    if (!success && message) {
      return { ok: false, error: message };
    }
    return { ok: true, data: (json as any).data ?? json };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Network error' };
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
