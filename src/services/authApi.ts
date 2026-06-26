/**
 * Autenticación JWT — POST /api/auth/*
 * Ref: docs/APP_INFLUENCER_IDENTITY_AND_STORY_CARDS.md
 */
import { formatHttpApiError } from '../utils/formatHttpApiError';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const rawBase = trimTrailingSlash(env || 'https://www.damecodigo.com/api');
  const withWww = rawBase.replace(/^https:\/\/damecodigo\.com(?=\/|$)/i, 'https://www.damecodigo.com');
  return withWww.endsWith('/api') ? withWww : `${withWww}/api`;
}

const API_BASE = getApiBase();
const AUTH_API = `${API_BASE}/auth`;

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  primaryRole?: string;
  profileTypes?: string[];
  isSuperuser?: boolean;
  superuser?: boolean;
  [key: string]: unknown;
}

export interface AuthLoginBody {
  login?: string;
  email?: string;
  password: string;
}

export interface AuthRegisterBody {
  email: string;
  password: string;
  displayName?: string;
  primaryRole?: 'influencer' | 'user' | string;
  phone?: string;
}

export interface AuthTokensResponse {
  ok: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
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

function extractTokens(json: Record<string, unknown>): {
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
} {
  const data = json.data as Record<string, unknown> | undefined;
  const token =
    (typeof json.token === 'string' ? json.token : undefined) ??
    (typeof data?.token === 'string' ? data.token : undefined) ??
    (typeof data?.accessToken === 'string' ? data.accessToken : undefined);
  const refreshToken =
    (typeof json.refreshToken === 'string' ? json.refreshToken : undefined) ??
    (typeof data?.refreshToken === 'string' ? data.refreshToken : undefined);
  const userRaw = json.user ?? data?.user;
  const user =
    userRaw && typeof userRaw === 'object' ? (userRaw as AuthUser) : undefined;
  return { token, refreshToken, user };
}

export async function authLogin(body: AuthLoginBody): Promise<AuthTokensResponse> {
  try {
    const payload = {
      password: body.password,
      ...(body.login ? { login: body.login } : {}),
      ...(body.email ? { email: body.email } : {}),
    };
    const res = await fetch(`${AUTH_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await parseJson(res);
    const { token, refreshToken, user } = extractTokens(json);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
        code: typeof json.code === 'string' ? json.code : undefined,
      };
    }
    if (!token) {
      return { ok: false, error: message ?? 'El servidor no devolvió token' };
    }
    return { ok: true, token, refreshToken, user };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function authRegister(body: AuthRegisterBody): Promise<AuthTokensResponse> {
  try {
    const res = await fetch(`${AUTH_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: body.email.trim(),
        password: body.password,
        displayName: body.displayName?.trim() || undefined,
        primaryRole: body.primaryRole ?? 'influencer',
        phone: body.phone?.trim() || undefined,
      }),
    });
    const json = await parseJson(res);
    const { token, refreshToken, user } = extractTokens(json);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return {
        ok: false,
        error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`),
      };
    }
    if (!token) {
      return { ok: false, error: message ?? 'Registro sin token' };
    }
    return { ok: true, token, refreshToken, user };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function authRefresh(refreshToken: string): Promise<AuthTokensResponse> {
  try {
    const res = await fetch(`${AUTH_API}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await parseJson(res);
    const { token, refreshToken: newRefresh, user } = extractTokens(json);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return { ok: false, error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`) };
    }
    if (!token) {
      return { ok: false, error: message ?? 'Refresh sin token' };
    }
    return { ok: true, token, refreshToken: newRefresh ?? refreshToken, user };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function authMe(accessToken: string): Promise<{
  ok: boolean;
  user?: AuthUser;
  error?: string;
}> {
  try {
    const res = await fetch(`${AUTH_API}/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const json = await parseJson(res);
    const message =
      (typeof json.message === 'string' ? json.message : undefined) ??
      (typeof json.error === 'string' ? json.error : undefined);
    if (!res.ok) {
      return { ok: false, error: formatHttpApiError(res.status, message ?? `HTTP ${res.status}`) };
    }
    const userRaw = json.user ?? (json.data as Record<string, unknown> | undefined)?.user ?? json.data;
    if (userRaw && typeof userRaw === 'object') {
      return { ok: true, user: userRaw as AuthUser };
    }
    return { ok: false, error: message ?? 'Sin datos de usuario' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export async function authLogout(refreshToken?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${AUTH_API}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    if (!res.ok) {
      const json = await parseJson(res);
      const message =
        (typeof json.message === 'string' ? json.message : undefined) ??
        `HTTP ${res.status}`;
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg || 'Network error' };
  }
}

export function authHeaders(accessToken?: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (accessToken?.trim()) h.Authorization = `Bearer ${accessToken.trim()}`;
  return h;
}
