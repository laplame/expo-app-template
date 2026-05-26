import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NostrFeedMode } from './nostrSocialStorage';
import { buildNostrFeedCacheKey } from './nostrFeedCache';

const SESSION_KEY = '@link4deal/nostr_feed_session_v1';

export type NostrFeedSessionSnapshot = {
  cacheKey: string;
  feedMode: NostrFeedMode;
  hashtag: string;
  scrollOffset: number;
  savedAt: number;
};

type StoredSessions = Record<string, NostrFeedSessionSnapshot>;

function isSnapshot(row: unknown): row is NostrFeedSessionSnapshot {
  if (!row || typeof row !== 'object') return false;
  const o = row as Record<string, unknown>;
  return (
    typeof o.cacheKey === 'string' &&
    typeof o.scrollOffset === 'number' &&
    typeof o.savedAt === 'number' &&
    (o.feedMode === 'latest' || o.feedMode === 'following' || o.feedMode === 'hashtag') &&
    typeof o.hashtag === 'string'
  );
}

async function readAll(): Promise<StoredSessions> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: StoredSessions = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isSnapshot(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeAll(map: StoredSessions): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function getNostrFeedSession(
  cacheKey: string
): Promise<NostrFeedSessionSnapshot | null> {
  const all = await readAll();
  return all[cacheKey] ?? null;
}

export async function setNostrFeedSession(
  snapshot: NostrFeedSessionSnapshot
): Promise<void> {
  const all = await readAll();
  all[snapshot.cacheKey] = snapshot;
  await writeAll(all);
}

export function buildSessionCacheKey(
  mode: NostrFeedMode,
  following: string[],
  hashtag: string
): string {
  return buildNostrFeedCacheKey(mode, following, hashtag);
}
