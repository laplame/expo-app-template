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
  /https?:\/\/[^\s<>"']+\.(?:mp4|webm)(?:\?[^\s<>"']*)?/gi;

function extractUrls(text: string, re: RegExp): string[] {
  const m = text.match(re);
  return m ? [...new Set(m)] : [];
}

function stripMediaUrls(text: string): string {
  return text
    .replace(IMAGE_IN_TEXT, '')
    .replace(VIDEO_IN_TEXT, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
]);

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
  if (typeof j.type === 'string' && HIDDEN_JSON_NOTE_TYPES.has(j.type)) return true;
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
  const images = extractUrls(ev.content, IMAGE_IN_TEXT);
  const videos = extractUrls(ev.content, VIDEO_IN_TEXT);
  return {
    id: ev.id,
    pubkey: ev.pubkey,
    createdAt: ev.created_at,
    content: stripMediaUrls(ev.content) || ev.content.trim(),
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

export function mergeFeedWithSeed(
  seed: NostrFeedItem[],
  relay: NostrFeedItem[]
): NostrFeedItem[] {
  const seen = new Set<string>();
  const merged: NostrFeedItem[] = [];
  for (const row of [...seed, ...relay]) {
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
