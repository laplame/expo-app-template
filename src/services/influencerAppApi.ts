/**
 * API app influencer — /api/influencers/app/*
 * Ref: docs/APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md
 */
import { formatHttpApiError } from '../utils/formatHttpApiError';
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

export interface InfluencerAppCampaign {
  id?: string;
  _id?: string;
  promotionId?: string;
  title?: string;
  discountPercentage?: number;
  shortCode?: string;
  status?: string;
  [key: string]: unknown;
}

export interface InfluencerAppIdentity {
  displayName?: string;
  avatar?: string;
  profileShortCode?: string;
  [key: string]: unknown;
}

export interface InfluencerAppWallet {
  walletAddress?: string;
  preferredNetwork?: string;
  [key: string]: unknown;
}

export interface VerifyInfluencerSessionBody {
  walletAddress?: string;
  preferredNetwork?: 'polygon' | 'ethereum' | string;
  deviceId?: string;
}

export interface VerifyInfluencerSessionResult {
  ok: boolean;
  identity?: InfluencerAppIdentity;
  wallet?: InfluencerAppWallet;
  influencer?: InfluencerDoc;
  campaigns?: InfluencerAppCampaign[];
  influencerProfileShortCode?: string;
  error?: string;
  code?: string;
}

export interface CreateStoryCardBody {
  promotionId: string;
  shortCode?: string;
  discountPercentage?: number;
  campaignId?: string;
}

export interface StoryCardResult {
  ok: boolean;
  imageUrl?: string;
  storyUrl?: string;
  data?: Record<string, unknown>;
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

function unwrapSessionPayload(json: Record<string, unknown>): VerifyInfluencerSessionResult {
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
  return {
    ok: true,
    identity: data.identity as InfluencerAppIdentity | undefined,
    wallet: data.wallet as InfluencerAppWallet | undefined,
    influencer: data.influencer as InfluencerDoc | undefined,
    campaigns,
    influencerProfileShortCode: shortCode,
  };
}

/**
 * Tras login: valida influencer vinculado, sincroniza wallet y devuelve campañas.
 * POST /api/influencers/app/verify-session
 */
export async function verifyInfluencerSession(
  body: VerifyInfluencerSessionBody,
  accessToken: string
): Promise<VerifyInfluencerSessionResult> {
  try {
    const res = await fetch(`${APP_BASE}/verify-session`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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

/** PATCH /api/influencers/app/wallet */
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
      body: JSON.stringify(body),
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return { ok: false, error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`) };
    }
    const data = (json.data ?? json) as Record<string, unknown>;
    return { ok: true, wallet: data.wallet as InfluencerAppWallet | undefined };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

/** GET /api/influencers/app/campaigns */
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

/** POST /api/influencers/app/story-cards — story 9:16 con código corto */
export async function createInfluencerStoryCard(
  body: CreateStoryCardBody,
  accessToken: string
): Promise<StoryCardResult> {
  try {
    const res = await fetch(`${APP_BASE}/story-cards`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    const imageUrl =
      (typeof data.imageUrl === 'string' ? data.imageUrl : undefined) ??
      (typeof data.storyImageUrl === 'string' ? data.storyImageUrl : undefined);
    const storyUrl = typeof data.storyUrl === 'string' ? data.storyUrl : undefined;
    return { ok: true, imageUrl, storyUrl, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}
