/**
 * API app influencer — /api/influencers/app/*
 * Ref: docs/APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md
 *      docs/INFLUENCER_TOKEN_SETTLEMENT_MONGO.md
 */
import { formatHttpApiError } from '../utils/formatHttpApiError';
import { resolveUploadUrl } from '../utils/resolveUploadUrl';
import { authHeaders } from './authApi';
import type { InfluencerDoc } from './influencersApi';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const rawBase = trimTrailingSlash(env || 'https://www.damecodigo.com/api');
  const withWww = rawBase.replace(/^https:\/\/damecodigo\.com(?=\/|$)/i, 'https://www.damecodigo.com');
  return withWww.endsWith('/api') ? withWww : `${withWww}/api`;
}

const APP_BASE = `${getApiBase()}/influencers/app`;

export type IdentityVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface CampaignPromotionRef {
  id?: string;
  title?: string;
  brand?: string;
  image?: string;
  status?: string;
  validUntil?: string;
  redirectInsteadOfQr?: boolean;
}

export interface CampaignSettlementSnapshot {
  commissionPerRedemptionUsd?: number;
  pendingCount?: number;
  pendingAmountUsd?: number;
  paidCount?: number;
  paidAmountUsd?: number;
  tokenSymbol?: string;
  transferMethod?: string;
}

export interface InfluencerAppCampaign {
  id?: string;
  _id?: string;
  promotionId?: string;
  shortCode?: string;
  label?: string;
  title?: string;
  referralPrefix?: string;
  referralCode?: string;
  expiresAt?: string | null;
  canIssueCoupon?: boolean;
  issueMode?: string;
  discountPercentage?: number;
  status?: string;
  promotion?: CampaignPromotionRef;
  settlement?: CampaignSettlementSnapshot;
  [key: string]: unknown;
}

export interface InfluencerAppIdentity {
  userId?: string;
  email?: string;
  influencerId?: string;
  influencerStatus?: string;
  identityVerificationStatus?: IdentityVerificationStatus;
  displayName?: string;
  avatar?: string;
  profileShortCode?: string;
  [key: string]: unknown;
}

export interface InfluencerAppWallet {
  address?: string;
  walletAddress?: string;
  preferredNetwork?: string;
  source?: string;
  syncedFromApp?: boolean;
}

export interface SettlementsByPromotion {
  promotionId?: string;
  pendingCount?: number;
  pendingAmountUsd?: number;
  paidCount?: number;
  paidAmountUsd?: number;
}

export interface InfluencerSettlementsSummary {
  pendingCount?: number;
  pendingAmountUsd?: number;
  paidCount?: number;
  paidAmountUsd?: number;
  byPromotion?: SettlementsByPromotion[];
}

export interface InfluencerSettlementsConfig {
  enabled?: boolean;
  transferMethod?: string;
  tokenSymbol?: string;
  payoutWallet?: string;
  payoutWalletRequired?: boolean;
  summary?: InfluencerSettlementsSummary;
}

export interface VerifyInfluencerSessionBody {
  walletAddress?: string;
  wallet?: string;
  preferredNetwork?: 'polygon' | 'ethereum' | string;
  blockchain?: string;
  deviceId?: string;
  syncWallet?: boolean;
}

export interface VerifyInfluencerSessionResult {
  ok: boolean;
  verified?: boolean;
  dashboardAccess?: boolean;
  identityVerificationStatus?: IdentityVerificationStatus;
  accessMessage?: string;
  identity?: InfluencerAppIdentity;
  wallet?: InfluencerAppWallet;
  influencer?: InfluencerDoc;
  campaigns?: InfluencerAppCampaign[];
  influencerProfileShortCode?: string;
  settlements?: InfluencerSettlementsConfig;
  error?: string;
  code?: string;
}

export interface CreateStoryCardBody {
  promotionId?: string;
  shortCode?: string;
  code?: string;
  discountPercentage?: number;
}

export interface StoryCardNanoBanana {
  model?: string;
  generated?: boolean;
  prompt?: string;
  message?: string | null;
}

export interface StoryCardResult {
  ok: boolean;
  imageUrl?: string;
  promptForClient?: string | null;
  shortCode?: string;
  referralCode?: string;
  discountPercentage?: number;
  nanoBanana?: StoryCardNanoBanana;
  data?: Record<string, unknown>;
  error?: string;
  code?: string;
}

export interface InfluencerSettlementDoc {
  settlementId?: string;
  couponTokenId?: string;
  promotionId?: string;
  amountUsd?: number;
  amountTokens?: number;
  walletAddress?: string;
  status?: string;
  transfer?: {
    method?: string;
    paidAt?: string | null;
    txRef?: string | null;
  };
  redeemedAt?: string;
}

export interface ProcessPendingSettlementsResult {
  ok: boolean;
  processed?: number;
  failed?: number;
  results?: Array<{ settlementId?: string; ok?: boolean; txRef?: string; error?: string }>;
  summary?: InfluencerSettlementsSummary;
  error?: string;
  code?: string;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseWallet(raw: unknown): InfluencerAppWallet | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const w = raw as Record<string, unknown>;
  const address =
    (typeof w.address === 'string' ? w.address : undefined) ??
    (typeof w.walletAddress === 'string' ? w.walletAddress : undefined);
  return {
    address,
    walletAddress: address,
    preferredNetwork: typeof w.preferredNetwork === 'string' ? w.preferredNetwork : undefined,
    source: typeof w.source === 'string' ? w.source : undefined,
    syncedFromApp: w.syncedFromApp === true,
  };
}

function parseSettlements(raw: unknown): InfluencerSettlementsConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  const summaryRaw = s.summary as Record<string, unknown> | undefined;
  return {
    enabled: s.enabled === true,
    transferMethod: typeof s.transferMethod === 'string' ? s.transferMethod : undefined,
    tokenSymbol: typeof s.tokenSymbol === 'string' ? s.tokenSymbol : undefined,
    payoutWallet: typeof s.payoutWallet === 'string' ? s.payoutWallet : undefined,
    payoutWalletRequired: s.payoutWalletRequired === true,
    summary: summaryRaw
      ? {
          pendingCount: Number(summaryRaw.pendingCount) || 0,
          pendingAmountUsd: Number(summaryRaw.pendingAmountUsd) || 0,
          paidCount: Number(summaryRaw.paidCount) || 0,
          paidAmountUsd: Number(summaryRaw.paidAmountUsd) || 0,
          byPromotion: Array.isArray(summaryRaw.byPromotion)
            ? (summaryRaw.byPromotion as SettlementsByPromotion[])
            : [],
        }
      : undefined,
  };
}

export function unwrapSessionPayload(json: Record<string, unknown>): VerifyInfluencerSessionResult {
  const data = (json.data ?? json) as Record<string, unknown>;
  const campaignsRaw = data.campaigns;
  const campaigns = Array.isArray(campaignsRaw)
    ? (campaignsRaw as InfluencerAppCampaign[])
    : [];
  const inf = data.influencer as Record<string, unknown> | undefined;
  const shortCode =
    (typeof data.influencerProfileShortCode === 'string'
      ? data.influencerProfileShortCode
      : undefined) ??
    (typeof inf?.publicSlug === 'string' ? inf.publicSlug : undefined) ??
    (typeof inf?.username === 'string' ? inf.username : undefined);

  const identityRaw = data.identity as Record<string, unknown> | undefined;
  const idStatus =
    (typeof data.identityVerificationStatus === 'string'
      ? data.identityVerificationStatus
      : undefined) ??
    (typeof identityRaw?.identityVerificationStatus === 'string'
      ? identityRaw.identityVerificationStatus
      : undefined);

  const dashboardAccess =
    data.dashboardAccess === true ||
    data.verified === true ||
    idStatus === 'approved';

  return {
    ok: true,
    verified: data.verified === true || dashboardAccess,
    dashboardAccess,
    identityVerificationStatus: idStatus as IdentityVerificationStatus | undefined,
    accessMessage: typeof data.accessMessage === 'string' ? data.accessMessage : undefined,
    identity: data.identity as InfluencerAppIdentity | undefined,
    wallet: parseWallet(data.wallet),
    influencer: data.influencer as InfluencerDoc | undefined,
    campaigns,
    influencerProfileShortCode: shortCode,
    settlements: parseSettlements(data.settlements),
  };
}

function parseStoryCardPayload(json: Record<string, unknown>): StoryCardResult {
  const data = (json.data ?? json) as Record<string, unknown>;
  const imageObj = data.image as Record<string, unknown> | undefined;
  const imagePath =
    (typeof imageObj?.url === 'string' ? imageObj.url : undefined) ??
    (typeof data.imageUrl === 'string' ? data.imageUrl : undefined);
  const nanoRaw = data.nanoBanana as Record<string, unknown> | undefined;
  return {
    ok: true,
    imageUrl: resolveUploadUrl(imagePath),
    promptForClient:
      typeof data.promptForClient === 'string'
        ? data.promptForClient
        : data.promptForClient === null
          ? null
          : undefined,
    shortCode: typeof data.shortCode === 'string' ? data.shortCode : undefined,
    referralCode: typeof data.referralCode === 'string' ? data.referralCode : undefined,
    discountPercentage:
      typeof data.discountPercentage === 'number' ? data.discountPercentage : undefined,
    nanoBanana: nanoRaw
      ? {
          model: typeof nanoRaw.model === 'string' ? nanoRaw.model : undefined,
          generated: nanoRaw.generated === true,
          prompt: typeof nanoRaw.prompt === 'string' ? nanoRaw.prompt : undefined,
          message:
            typeof nanoRaw.message === 'string'
              ? nanoRaw.message
              : nanoRaw.message === null
                ? null
                : undefined,
        }
      : undefined,
    data,
  };
}

export async function verifyInfluencerSession(
  body: VerifyInfluencerSessionBody,
  accessToken: string
): Promise<VerifyInfluencerSessionResult> {
  try {
    const payload = {
      ...body,
      walletAddress: body.walletAddress ?? body.wallet,
      preferredNetwork: body.preferredNetwork ?? body.blockchain,
    };
    const res = await fetch(`${APP_BASE}/verify-session`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    const code = typeof json.code === 'string' ? json.code : undefined;
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code,
      };
    }
    if (json.success === false) {
      return { ok: false, error: message ?? 'Sesión no verificada', code };
    }
    return unwrapSessionPayload(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function patchInfluencerAppWallet(
  body: VerifyInfluencerSessionBody,
  accessToken: string
): Promise<{ ok: boolean; wallet?: InfluencerAppWallet; error?: string }> {
  try {
    const res = await fetch(`${APP_BASE}/wallet`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: body.walletAddress ?? body.wallet,
        preferredNetwork: body.preferredNetwork ?? body.blockchain,
      }),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return { ok: false, error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`) };
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    return { ok: true, wallet: parseWallet(data.wallet) };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function getInfluencerAppCampaigns(
  accessToken: string
): Promise<{ ok: boolean; campaigns?: InfluencerAppCampaign[]; error?: string }> {
  try {
    const res = await fetch(`${APP_BASE}/campaigns`, {
      method: 'GET',
      headers: authHeaders(accessToken),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return { ok: false, error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`) };
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    const campaignsRaw = data.campaigns ?? data;
    const campaigns = Array.isArray(campaignsRaw)
      ? (campaignsRaw as InfluencerAppCampaign[])
      : [];
    return { ok: true, campaigns };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function getInfluencerSettlementsSummary(
  accessToken: string
): Promise<{ ok: boolean; settlements?: InfluencerSettlementsConfig; error?: string; code?: string }> {
  try {
    const res = await fetch(`${APP_BASE}/settlements/summary`, {
      method: 'GET',
      headers: authHeaders(accessToken),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    const code = typeof json.code === 'string' ? json.code : undefined;
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code,
      };
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    return {
      ok: true,
      settlements: parseSettlements({ ...data, summary: data.summary ?? data }),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function getInfluencerSettlements(
  accessToken: string,
  query?: { page?: number; limit?: number; status?: string; promotionId?: string }
): Promise<{
  ok: boolean;
  docs?: InfluencerSettlementDoc[];
  total?: number;
  page?: number;
  error?: string;
  code?: string;
}> {
  try {
    const q = new URLSearchParams();
    if (query?.page) q.set('page', String(query.page));
    if (query?.limit) q.set('limit', String(query.limit));
    if (query?.status) q.set('status', query.status);
    if (query?.promotionId) q.set('promotionId', query.promotionId);
    const qs = q.toString();
    const res = await fetch(`${APP_BASE}/settlements${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: authHeaders(accessToken),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    const code = typeof json.code === 'string' ? json.code : undefined;
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code,
      };
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    const docsRaw = data.docs ?? data;
    const docs = Array.isArray(docsRaw) ? (docsRaw as InfluencerSettlementDoc[]) : [];
    return {
      ok: true,
      docs,
      total: typeof data.total === 'number' ? data.total : docs.length,
      page: typeof data.page === 'number' ? data.page : 1,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function processInfluencerPendingSettlements(
  accessToken: string,
  body?: { limit?: number }
): Promise<ProcessPendingSettlementsResult> {
  try {
    const res = await fetch(`${APP_BASE}/settlements/process-pending`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    const code = typeof json.code === 'string' ? json.code : undefined;
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code,
      };
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    const summaryRaw = data.summary as Record<string, unknown> | undefined;
    return {
      ok: true,
      processed: typeof data.processed === 'number' ? data.processed : undefined,
      failed: typeof data.failed === 'number' ? data.failed : undefined,
      results: Array.isArray(data.results)
        ? (data.results as ProcessPendingSettlementsResult['results'])
        : undefined,
      summary: summaryRaw
        ? {
            pendingCount: Number(summaryRaw.pendingCount) || 0,
            pendingAmountUsd: Number(summaryRaw.pendingAmountUsd) || 0,
            paidCount: Number(summaryRaw.paidCount) || 0,
            paidAmountUsd: Number(summaryRaw.paidAmountUsd) || 0,
          }
        : undefined,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function createInfluencerStoryCard(
  body: CreateStoryCardBody,
  accessToken: string
): Promise<StoryCardResult> {
  try {
    const payload: Record<string, unknown> = {};
    if (body.promotionId) payload.promotionId = body.promotionId;
    if (body.shortCode) payload.shortCode = body.shortCode;
    if (body.code) payload.code = body.code;
    if (body.discountPercentage != null) payload.discountPercentage = body.discountPercentage;

    const res = await fetch(`${APP_BASE}/story-cards`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    const code = typeof json.code === 'string' ? json.code : undefined;
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code,
      };
    }
    return parseStoryCardPayload(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

/** Título legible de campaña (label o promotion.title). */
export function campaignDisplayTitle(c: InfluencerAppCampaign): string {
  const promo = c.promotion;
  return (
    (typeof c.label === 'string' && c.label.trim()) ||
    (typeof promo?.title === 'string' && promo.title.trim()) ||
    (typeof c.title === 'string' && c.title.trim()) ||
    (typeof c.shortCode === 'string' && c.shortCode) ||
    'Campaña'
  );
}
