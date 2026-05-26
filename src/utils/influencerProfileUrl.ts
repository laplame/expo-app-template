import { Linking, Alert } from 'react-native';
import type { InfluencerDoc } from '../services/influencersApi';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/** Origen del sitio web (SPA). Ej. https://www.damecodigo.com */
/** Panel del creador (promos, deals, redenciones en la web). */
export function getInfluencerOwnerPortalUrl(): string {
  return `${getSiteOrigin()}/influencer/me`;
}

/** Alta / registro de nuevo perfil en la web. */
export function getInfluencerSetupUrl(): string {
  return `${getSiteOrigin()}/influencer-setup`;
}

export function getSiteOrigin(): string {
  const env = process.env.EXPO_PUBLIC_SITE_URL?.trim();
  if (env) return trimTrailingSlash(env);
  const api = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (api) {
    const base = trimTrailingSlash(api).replace(/\/api\/?$/i, '');
    if (base) return base.replace(/^https:\/\/damecodigo\.com(?=\/|$)/i, 'https://www.damecodigo.com');
  }
  return 'https://www.damecodigo.com';
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
}

/** ¿Parece código QR/campaña (ej. DNF9YTP2) y no slug de perfil web? */
function looksLikeQrShortCode(value: string): boolean {
  const s = value.trim();
  if (s.length < 4 || s.length > 12) return false;
  return /^[A-Z0-9]+$/i.test(s) && !s.includes('-') && /[0-9]/.test(s) && /[A-Z]/i.test(s);
}

function firstSocialHandle(doc: InfluencerDoc): string | undefined {
  const sm = doc.socialMedia;
  if (!sm) return undefined;
  if (Array.isArray(sm)) {
    for (const entry of sm) {
      const u = (entry.username ?? entry.url ?? '').trim().replace(/^@/, '');
      if (u && !u.startsWith('http')) return u;
    }
    return undefined;
  }
  const obj = sm as Record<string, string>;
  for (const key of ['instagram', 'tiktok', 'youtube', 'twitter']) {
    const u = (obj[key] ?? '').trim().replace(/^@/, '');
    if (u && !u.startsWith('http')) return u;
  }
  return undefined;
}

/**
 * Slug para la ruta web `/influencer/:slug`.
 * El API devuelve `publicSlug` (ej. luccylamademoiselita) y aparte `profileShortCode` (ej. DNF9YTP2) para cupones.
 */
export function getInfluencerPublicSlug(doc: InfluencerDoc): string | undefined {
  const record = doc as Record<string, unknown>;
  const candidates: unknown[] = [
    record.publicSlug,
    record.public_slug,
    doc.username,
    record.slug,
    record.handle,
    firstSocialHandle(doc),
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const slug = normalizeSlug(c);
      if (slug.length >= 2) return slug.slice(0, 64);
    }
  }

  // profileShortCode solo si no parece código alfanumérico de cupón
  const shortCandidates = [doc.profileShortCode, record.influencerProfileShortCode];
  for (const c of shortCandidates) {
    if (typeof c === 'string' && c.trim()) {
      const s = normalizeSlug(c);
      if (s.length >= 2 && !looksLikeQrShortCode(s)) return s.slice(0, 64);
    }
  }

  const name = (doc.displayName ?? doc.name ?? '').toString().trim();
  if (!name) return undefined;
  const derived = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return derived.length >= 3 ? derived.slice(0, 64) : undefined;
}

/** @deprecated Usar getInfluencerPublicSlug — nombre histórico */
export function getInfluencerProfileShortCode(doc: InfluencerDoc): string | undefined {
  return getInfluencerPublicSlug(doc);
}

export function getInfluencerProfileUrl(doc: InfluencerDoc): string | null {
  const slug = getInfluencerPublicSlug(doc);
  if (!slug) return null;
  return `${getSiteOrigin()}/influencer/${slug}`;
}

export async function openInfluencerProfile(
  doc: InfluencerDoc,
  language: 'es' | 'en' = 'es'
): Promise<boolean> {
  const url = getInfluencerProfileUrl(doc);
  if (!url) {
    Alert.alert(
      language === 'es' ? 'Perfil no disponible' : 'Profile unavailable',
      language === 'es'
        ? 'Este influencer aún no tiene enlace público en DameCodigo.'
        : 'This influencer does not have a public DameCodigo link yet.',
      [{ text: 'OK' }]
    );
    return false;
  }
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      language === 'es' ? 'No se pudo abrir' : 'Could not open',
      url,
      [{ text: 'OK' }]
    );
    return false;
  }
}
