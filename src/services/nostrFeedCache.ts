import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NostrFeedItem } from '../types/nostrFeed';
import type { NostrFeedMode } from './nostrSocialStorage';

const KEY_PREFIX = '@link4deal/nostr_feed_cache_v1:';

export function buildNostrFeedCacheKey(
  mode: NostrFeedMode,
  following: string[],
  hashtag: string
): string {
  if (mode === 'latest') return 'latest';
  if (mode === 'following') {
    return `following:${[...following].sort().join(',')}`;
  }
  const h = hashtag.replace(/^#/, '').trim().toLowerCase();
  return `hashtag:${h}`;
}

function storageKey(cacheKey: string): string {
  return `${KEY_PREFIX}${cacheKey}`;
}

function isFeedRow(row: unknown): row is NostrFeedItem {
  if (!row || typeof row !== 'object') return false;
  const o = row as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.pubkey === 'string';
}

export async function getNostrFeedCache(cacheKey: string): Promise<NostrFeedItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(cacheKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const items = parsed.filter(isFeedRow);
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export async function setNostrFeedCache(cacheKey: string, items: NostrFeedItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(cacheKey), JSON.stringify(items));
  } catch {
    // ignore
  }
}
