import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  FOLLOWING: '@link4deal/nostr_following_pubkeys',
  HASHTAG: '@link4deal/nostr_feed_hashtag',
  PROFILE: '@link4deal/nostr_local_profile',
  FEED_MODE: '@link4deal/nostr_feed_mode',
} as const;

export type NostrFeedMode = 'latest' | 'following' | 'hashtag';

export type NostrLocalProfile = {
  displayName: string;
  pictureUrl: string;
  nip05: string;
};

const defaultProfile = (): NostrLocalProfile => ({
  displayName: '',
  pictureUrl: '',
  nip05: '',
});

export async function getNostrFeedMode(): Promise<NostrFeedMode> {
  try {
    const v = await AsyncStorage.getItem(KEYS.FEED_MODE);
    if (v === 'following' || v === 'hashtag' || v === 'latest') return v;
  } catch {
    // ignore
  }
  return 'latest';
}

export async function setNostrFeedMode(mode: NostrFeedMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.FEED_MODE, mode);
  } catch {
    // ignore
  }
}

export async function getNostrHashtag(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(KEYS.HASHTAG);
    return (v ?? '').replace(/^#/, '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export async function setNostrHashtag(tag: string): Promise<void> {
  const clean = tag.replace(/^#/, '').trim().toLowerCase();
  try {
    if (clean) await AsyncStorage.setItem(KEYS.HASHTAG, clean);
    else await AsyncStorage.removeItem(KEYS.HASHTAG);
  } catch {
    // ignore
  }
}

export async function getNostrFollowing(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FOLLOWING);
    if (!raw) return [];
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j
      .filter((x): x is string => typeof x === 'string' && /^[a-f0-9]{64}$/i.test(x))
      .map((x) => x.toLowerCase());
  } catch {
    return [];
  }
}

export async function setNostrFollowing(pubkeys: string[]): Promise<void> {
  const uniq = [...new Set(pubkeys.map((p) => p.toLowerCase()).filter((p) => /^[a-f0-9]{64}$/.test(p)))];
  try {
    await AsyncStorage.setItem(KEYS.FOLLOWING, JSON.stringify(uniq));
  } catch {
    // ignore
  }
}

export async function addNostrFollowing(pubkeyHex: string): Promise<void> {
  const pk = pubkeyHex.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(pk)) return;
  const cur = await getNostrFollowing();
  if (cur.includes(pk)) return;
  await setNostrFollowing([...cur, pk]);
}

export async function removeNostrFollowing(pubkeyHex: string): Promise<void> {
  const pk = pubkeyHex.toLowerCase();
  const cur = await getNostrFollowing();
  await setNostrFollowing(cur.filter((p) => p !== pk));
}

export async function getNostrLocalProfile(): Promise<NostrLocalProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROFILE);
    if (!raw) return defaultProfile();
    const j = JSON.parse(raw) as Partial<NostrLocalProfile>;
    return {
      displayName: typeof j.displayName === 'string' ? j.displayName : '',
      pictureUrl: typeof j.pictureUrl === 'string' ? j.pictureUrl : '',
      nip05: typeof j.nip05 === 'string' ? j.nip05.trim() : '',
    };
  } catch {
    return defaultProfile();
  }
}

export async function setNostrLocalProfile(p: NostrLocalProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEYS.PROFILE,
      JSON.stringify({
        displayName: p.displayName.trim(),
        pictureUrl: p.pictureUrl.trim(),
        nip05: p.nip05.trim(),
      })
    );
  } catch {
    // ignore
  }
}
