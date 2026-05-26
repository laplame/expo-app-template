import type { Event } from 'nostr-tools';
import { SimplePool } from 'nostr-tools';
import type { NostrFeedItem } from '../types/nostrFeed';
import type { NostrFeedMode } from './nostrSocialStorage';

export type { NostrFeedItem };

export type NostrFeedQuery = {
  mode: NostrFeedMode;
  /** Hex pubkeys when mode === following */
  following: string[];
  /** Without # when mode === hashtag */
  hashtag: string;
};

const IMAGE_IN_TEXT =
  /https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<>"']*)?/gi;
const VIDEO_IN_TEXT =
  /https?:\/\/[^\s<>"']+\.(?:mp4|webm|m3u8|mov|m4v|mkv)(?:\?[^\s<>"']*)?/gi;

/** Markdown: ![alt](https://…) — la URL a menudo no lleva extensión en la ruta. */
const MARKDOWN_IMAGE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi;

/** URLs sueltas en el texto (luego filtramos por extensión, query o host conocido). */
const LOOSE_HTTP_URL = /https?:\/\/[^\s<>"')]+/gi;

const KNOWN_IMG_HOST_SUFFIXES = [
  'nostr.build',
  'void.cat',
  'imgur.com',
  'twimg.com',
  'unsplash.com',
  'cloudinary.com',
  'imagedelivery.net',
  'primal.net',
  'nostrimg.com',
  'googleusercontent.com',
  'githubusercontent.com',
  'ibb.co',
  'tenor.com',
  'giphy.com',
  'ipfs.io',
  'dweb.link',
  'ipfs.dweb.link',
];

function extractUrls(text: string, re: RegExp): string[] {
  const m = text.match(re);
  return m ? [...new Set(m)] : [];
}

function trimUrlTrailingPunct(url: string): string {
  return url.replace(/[),.;:!?]+$/g, '');
}

function hostLooksLikeImageCdn(hostname: string): boolean {
  const h = hostname.replace(/^www\./, '').toLowerCase();
  if (h === 'images.unsplash.com' || h === 'picsum.photos') return true;
  return KNOWN_IMG_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
}

/** True si la URL probablemente apunta a una imagen (no vídeo). */
function looksLikeImageUrl(url: string): boolean {
  const lower = url.toLowerCase().split('#')[0];
  if (/\.(mp4|webm|mov|m4v|mkv)(\?|$|#|&)/i.test(lower)) return false;
  if (/\.(jpe?g|png|gif|webp|avif|bmp)(\?|$|#|&)/i.test(lower)) return true;
  if (/[?&]format=(jpe?g|png|gif|webp)/i.test(lower)) return true;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (u.hostname === 'images.unsplash.com' && path.includes('/photo-')) return true;
    if (u.hostname === 'picsum.photos') return true;
    if (hostLooksLikeImageCdn(u.hostname)) return true;
  } catch {
    return false;
  }
  return false;
}

/** NIP-92: etiquetas ["imeta", "url https://…", "m image/jpeg", …]. */
function extractImetaUrls(tags: string[][]): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    if (!tag?.length || tag[0] !== 'imeta') continue;
    for (let i = 1; i < tag.length; i++) {
      const part = tag[i];
      if (typeof part !== 'string') continue;
      if (part.toLowerCase().startsWith('url ')) {
        const u = trimUrlTrailingPunct(part.slice(4).trim());
        if (u.startsWith('http')) out.push(u);
      }
    }
  }
  return [...new Set(out)];
}

function extractMarkdownImages(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(MARKDOWN_IMAGE.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    if (m[1]) out.push(trimUrlTrailingPunct(m[1].trim()));
  }
  return [...new Set(out)];
}

function extractLooseImageUrls(text: string): string[] {
  const raw = text.match(LOOSE_HTTP_URL) ?? [];
  const cleaned = raw.map((u) => trimUrlTrailingPunct(u));
  return [...new Set(cleaned.filter(looksLikeImageUrl))];
}

function gatherImageUrlsFromEvent(ev: Event): string[] {
  const raw = ev.content ?? '';
  return [
    ...new Set([
      ...extractImetaUrls(ev.tags ?? []),
      ...extractMarkdownImages(raw),
      ...extractUrls(raw, IMAGE_IN_TEXT),
      ...extractLooseImageUrls(raw),
    ]),
  ];
}

function stripMarkdownImages(text: string): string {
  return text.replace(MARKDOWN_IMAGE, '').trim();
}

function stripMediaUrls(text: string): string {
  return text
    .replace(IMAGE_IN_TEXT, '')
    .replace(VIDEO_IN_TEXT, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Quita del cuerpo las URLs que ya mostramos como <Image> (incl. sin extensión). */
function stripListedImageUrls(text: string, imageUrls: string[]): string {
  let t = text;
  for (const u of [...imageUrls].sort((a, b) => b.length - a.length)) {
    if (u && t.includes(u)) t = t.split(u).join('');
  }
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Algunos relays o apps publican kind:1 con JSON de sistema (presencia, métricas).
 * No son “posts” legibles: los ocultamos del feed social.
 */
const HIDDEN_JSON_NOTE_TYPES = new Set([
  'zone_presence',
  'telemetry',
  'heartbeat',
  'device_metrics',
  'service_status',
  'swarm_identity_record',
  /** Puerta de enlace / NVR u otros clientes que publican solicitudes firmadas como texto. */
  'gateway_grant_request',
]);

function jsonLooksLikeMachineNote(j: Record<string, unknown>): boolean {
  if (typeof j.type === 'string' && HIDDEN_JSON_NOTE_TYPES.has(j.type)) return true;
  if (j.kind === 30078) return true;
  if (typeof j.type === 'string') {
    const t = j.type.toLowerCase();
    if (t.startsWith('swarm_') || t.endsWith('_identity_record')) return true;
    if (t.startsWith('gateway_') && (t.endsWith('_request') || t.endsWith('_response'))) return true;
  }
  /** Patrón gateway/NVR: `gw-grant-…` + service + action (no son posts sociales). */
  if (
    typeof j.requestId === 'string' &&
    /^gw-grant-/i.test(j.requestId) &&
    typeof j.service === 'string' &&
    typeof j.action === 'string'
  ) {
    return true;
  }
  return false;
}

function isNonDisplayableKind1Content(content: string): boolean {
  const t = content.trim();
  if (t.length < 12 || !t.startsWith('{') || !t.endsWith('}')) return false;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(t) as Record<string, unknown>;
  } catch {
    return false;
  }
  if (!j || typeof j !== 'object') return false;
  if (jsonLooksLikeMachineNote(j)) return true;
  if (
    typeof j.zone === 'string' &&
    typeof j.devicePk === 'string' &&
    Array.isArray(j.relays)
  ) {
    return true;
  }
  if (
    j.metrics != null &&
    typeof j.metrics === 'object' &&
    typeof j.serviceVersion === 'string' &&
    typeof j.releaseChannel === 'string'
  ) {
    return true;
  }
  /** JSON embebido en `content` (p. ej. replaceable con string escapado). */
  if (typeof j.content === 'string') {
    const innerRaw = j.content.trim();
    if (innerRaw.startsWith('{') && innerRaw.endsWith('}')) {
      try {
        const inner = JSON.parse(innerRaw) as Record<string, unknown>;
        if (inner && typeof inner === 'object' && jsonLooksLikeMachineNote(inner)) return true;
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

type Profile = { name?: string; picture?: string; nip05?: string };

function parseProfile(ev: Event): Profile {
  try {
    const j = JSON.parse(ev.content) as Profile;
    return typeof j === 'object' && j ? j : {};
  } catch {
    return {};
  }
}

function displayName(pubkey: string, p: Profile): string {
  const n = (p.name ?? '').trim();
  if (n) return n;
  return `${pubkey.slice(0, 6)}…${pubkey.slice(-4)}`;
}

export function mapNoteWithProfiles(
  ev: Event,
  profiles: Map<string, Profile>,
  stats?: { likes: number; reposts: number }
): NostrFeedItem {
  const p = profiles.get(ev.pubkey) ?? {};
  const images = gatherImageUrlsFromEvent(ev);
  const videos = extractUrls(ev.content, VIDEO_IN_TEXT);
  let body = stripMarkdownImages(ev.content);
  body = stripMediaUrls(body);
  body = stripListedImageUrls(body, images);
  return {
    id: ev.id,
    pubkey: ev.pubkey,
    createdAt: ev.created_at,
    content: body || ev.content.trim(),
    kind: ev.kind,
    imageUrls: images,
    videoUrl: videos[0],
    name: displayName(ev.pubkey, p),
    nip05: p.nip05,
    avatarUrl: p.picture,
    likes: stats?.likes ?? Math.min(999, 3 + (ev.id.charCodeAt(0) % 40)),
    reposts: stats?.reposts ?? Math.min(200, (ev.id.charCodeAt(1) ?? 0) % 25),
    verified: Boolean(p.nip05 && p.nip05.includes('@')),
    sourceEvent: ev,
  };
}

function buildNoteFilter(
  query: NostrFeedQuery,
  notesLimit: number
): Record<string, unknown> {
  const base: Record<string, unknown> = { kinds: [1], limit: notesLimit };
  if (query.mode === 'latest') return base;
  if (query.mode === 'following') {
    if (query.following.length === 0) return { ...base, limit: 0, authors: [] };
    return { ...base, authors: query.following };
  }
  const tag = query.hashtag.replace(/^#/, '').trim().toLowerCase();
  if (!tag) return base;
  return { ...base, '#t': [tag] };
}

export async function fetchNostrFeed(
  pool: SimplePool,
  relays: string[],
  query: NostrFeedQuery,
  opts?: { notesLimit?: number }
): Promise<NostrFeedItem[]> {
  const notesLimit = opts?.notesLimit ?? 45;
  const filter = buildNoteFilter(query, notesLimit) as {
    kinds: number[];
    limit: number;
    authors?: string[];
    '#t'?: string[];
  };

  if (query.mode === 'following' && query.following.length === 0) {
    return [];
  }

  const notes = await pool.querySync(relays, filter);
  const filteredNotes = notes.filter(
    (ev) => ev.kind === 1 && !isNonDisplayableKind1Content(ev.content)
  );

  const pubkeys = [...new Set(filteredNotes.map((e) => e.pubkey))];
  const profiles = new Map<string, Profile>();
  if (pubkeys.length) {
    const profEvents = await pool.querySync(relays, {
      kinds: [0],
      authors: pubkeys,
    });
    for (const pe of profEvents) {
      profiles.set(pe.pubkey, parseProfile(pe));
    }
  }

  const ids = filteredNotes.map((n) => n.id);
  const reactionCounts = await fetchReactionCounts(pool, relays, ids);

  return filteredNotes
    .sort((a, b) => b.created_at - a.created_at)
    .map((ev) =>
      mapNoteWithProfiles(ev, profiles, {
        likes: reactionCounts.get(ev.id) ?? 0,
        reposts: Math.min(200, (ev.id.charCodeAt(1) ?? 0) % 25),
      })
    );
}

/** Count kind 7 reactions with content "+" or empty (like). */
export async function fetchReactionCounts(
  pool: SimplePool,
  relays: string[],
  eventIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventIds.length === 0) return counts;

  const chunkSize = 25;
  for (let i = 0; i < eventIds.length; i += chunkSize) {
    const chunk = eventIds.slice(i, i + chunkSize);
    try {
      const reactions = await pool.querySync(relays, {
        kinds: [7],
        '#e': chunk,
        limit: 500,
      });
      for (const ev of reactions) {
        const c = ev.content?.trim() ?? '';
        if (c !== '' && c !== '+') continue;
        const eTag = ev.tags.find((t) => t[0] === 'e')?.[1];
        if (!eTag) continue;
        counts.set(eTag, (counts.get(eTag) ?? 0) + 1);
      }
    } catch {
      // ignore chunk errors
    }
  }
  return counts;
}

export function filterDisplayableNostrFeedItems(items: NostrFeedItem[]): NostrFeedItem[] {
  return items.filter((it) => it.kind !== 1 || !isNonDisplayableKind1Content(it.content));
}

export function mergeFeedWithSeed(
  seed: NostrFeedItem[],
  relay: NostrFeedItem[]
): NostrFeedItem[] {
  const seedF = filterDisplayableNostrFeedItems(seed);
  const relayF = filterDisplayableNostrFeedItems(relay);
  const seen = new Set<string>();
  const merged: NostrFeedItem[] = [];
  for (const row of [...seedF, ...relayF]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  merged.sort((a, b) => b.createdAt - a.createdAt);
  return merged;
}

/** Seed posts whose text matches a hashtag (for demo when relay returns few). */
export function filterSeedByHashtag(
  seed: NostrFeedItem[],
  hashtag: string
): NostrFeedItem[] {
  const t = hashtag.replace(/^#/, '').trim().toLowerCase();
  if (!t) return seed;
  return seed.filter(
    (s) =>
      s.content.toLowerCase().includes(`#${t}`) ||
      s.content.toLowerCase().includes(t)
  );
}
