import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  type ImageStyle,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SimplePool, finalizeEvent, getPublicKey, nip05, nip25 } from 'nostr-tools';
import { useSettings } from '../context/SettingsContext';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getNetworkP2PStrings } from '../i18n/uiStrings';
import { DEFAULT_NOSTR_RELAYS } from '../services/nostrRelays';
import {
  buildNostrFeedCacheKey,
  getNostrFeedCache,
  setNostrFeedCache,
} from '../services/nostrFeedCache';
import {
  fetchNostrFeed,
  filterDisplayableNostrFeedItems,
  filterSeedByHashtag,
  mergeFeedWithSeed,
} from '../services/nostrFeedService';
import type { NostrFeedItem } from '../types/nostrFeed';
import { NOSTR_SEED_FEED } from '../data/nostrSeedPosts';
import {
  getOrCreateNostrSecretKey,
  npubFromSecret,
} from '../services/nostrIdentity';
import {
  addNostrFollowing,
  getNostrFeedMode,
  getNostrFollowing,
  getNostrHashtag,
  getNostrLocalProfile,
  removeNostrFollowing,
  setNostrFeedMode,
  setNostrHashtag,
  setNostrLocalProfile,
  type NostrFeedMode,
  type NostrLocalProfile,
} from '../services/nostrSocialStorage';
import {
  getWalletAddresses,
  type WalletChain,
} from '../services/storage';
import { encodeNprofileQrPayload } from '../services/nostrShareCode';
import { formatAddressForUi } from '../utils/addressDisplay';
import { parseFollowPubkey, parseNostrPubkeyFromQrPayload } from '../utils/nostrFollowInput';
import { getNostrLinkedDisplayName } from '../utils/nostrKycDisplayName';
import PaidContent402Panel from '../components/PaidContent402Panel';
import { getSocialLayerColors, type SocialLayerColors } from '../theme/socialLayerTheme';
import { getAppTheme } from '../theme/appThemes';
import { getNostrFeedSession, setNostrFeedSession, buildSessionCacheKey } from '../services/nostrFeedSession';
import NostrFriendQrScanModal from '../components/NostrFriendQrScanModal';
import CollapsibleBottomPanel from '../components/CollapsibleBottomPanel';
import {
  isCloudinaryConfigured,
  uploadMediaToCloudinary,
} from '../services/cloudinary';
import { buildNostrNoteFromMedia } from '../utils/nostrComposeMedia';

const MAX_COMPOSE_ATTACHMENTS = 4;

type ComposeDraftMedia = {
  id: string;
  localUri: string;
  kind: 'image' | 'video';
};


type Nav = NativeStackNavigationProp<RootStackParamList, 'NetworkP2P'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Oculta el hueco del feed si la URL no carga (CDN, expiración, TLS). */
function FeedNoteImage({
  uri,
  style,
  onOpen,
  accessibilityLabel,
}: {
  uri: string;
  style: ImageStyle;
  onOpen: () => void;
  accessibilityLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const trimmed = (uri || '').trim();
  if (!trimmed || failed) return null;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Image
        source={{ uri: trimmed }}
        style={style}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </Pressable>
  );
}

function chainLabel(chain: WalletChain | undefined): string {
  switch (chain ?? 'ethereum') {
    case 'bitcoin':
      return 'BTC';
    case 'bitcoin-cash':
      return 'BCH';
    case 'polygon':
      return 'Polygon';
    case 'ripple':
      return 'XRP';
    case 'solana':
      return 'SOL';
    default:
      return 'ETH';
  }
}

function formatRelativeTime(ts: number, nowLabel: string): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return nowLabel;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

function feedTitle(
  mode: NostrFeedMode,
  hashtag: string,
  t: ReturnType<typeof getNetworkP2PStrings>
): string {
  if (mode === 'latest') return t.latest;
  if (mode === 'following') return t.filterFollowing;
  const h = hashtag.replace(/^#/, '').trim();
  return h ? `${t.feedHeadHashtag} #${h}` : t.filterHashtag;
}

function NostrContentText({
  content,
  bodyStyle,
  accentColor,
}: {
  content: string;
  bodyStyle: object;
  accentColor: string;
}) {
  const segments = useMemo(() => {
    const parts: { text: string; type: 'text' | 'url' | 'hashtag' }[] = [];
    const combinedRe = /https?:\/\/[^\s<>"']+|#[\wÀ-ɏḀ-ỿ]{1,64}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = combinedRe.exec(content)) !== null) {
      if (m.index > last) {
        parts.push({ text: content.slice(last, m.index), type: 'text' });
      }
      const val = m[0];
      parts.push({ text: val, type: val.startsWith('http') ? 'url' : 'hashtag' });
      last = m.index + val.length;
    }
    if (last < content.length) {
      parts.push({ text: content.slice(last), type: 'text' });
    }
    return parts;
  }, [content]);

  return (
    <Text style={bodyStyle}>
      {segments.map((seg, i) => {
        if (seg.type === 'url') {
          return (
            <Text
              key={i}
              style={{ color: accentColor, textDecorationLine: 'underline' }}
              onPress={() => Linking.openURL(seg.text).catch(() => {})}
              numberOfLines={1}
            >
              {seg.text.length > 60 ? `${seg.text.slice(0, 57)}…` : seg.text}
            </Text>
          );
        }
        if (seg.type === 'hashtag') {
          return (
            <Text key={i} style={{ color: accentColor, fontWeight: '600' }}>
              {seg.text}
            </Text>
          );
        }
        return <Text key={i}>{seg.text}</Text>;
      })}
    </Text>
  );
}

export default function NetworkP2PScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { language, appTheme, appBackgroundUri } = useSettings();
  const { revealWalletAddresses } = useVerificationAccess();
  const t = useMemo(() => getNetworkP2PStrings(language), [language]);
  const palette = useMemo(() => getSocialLayerColors(appTheme), [appTheme]);
  const themeDef = useMemo(() => getAppTheme(appTheme), [appTheme]);
  const styles = useMemo(() => createNetworkP2PStyles(palette), [palette]);

  const poolRef = useRef<SimplePool | null>(null);
  const feedListRef = useRef<FlatList<NostrFeedItem>>(null);
  const scrollOffsetRef = useRef(0);
  const scrollSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const skRef = useRef<Uint8Array | null>(null);

  const [npub, setNpub] = useState('');
  const [pubHex, setPubHex] = useState('');
  const [items, setItems] = useState<NostrFeedItem[]>(NOSTR_SEED_FEED);
  const [loading, setLoading] = useState(false);
  const [relayHint, setRelayHint] = useState<'ok' | 'warn'>('ok');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeMedia, setComposeMedia] = useState<ComposeDraftMedia[]>([]);
  const [posting, setPosting] = useState(false);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [valueOpen, setValueOpen] = useState(false);
  const [walletRows, setWalletRows] = useState<
    { address: string; chain: WalletChain | undefined }[]
  >([]);

  const [feedMode, setFeedMode] = useState<NostrFeedMode>('latest');
  const [following, setFollowing] = useState<string[]>([]);
  const [hashtagState, setHashtagState] = useState('');
  const [followInput, setFollowInput] = useState('');
  const [searchTagInput, setSearchTagInput] = useState('');
  const [hashtagDraft, setHashtagDraft] = useState('');
  const [localProfile, setLocalProfile] = useState<NostrLocalProfile>({
    displayName: '',
    pictureUrl: '',
    nip05: '',
  });
  const [profileDraft, setProfileDraft] = useState<NostrLocalProfile>({
    displayName: '',
    pictureUrl: '',
    nip05: '',
  });
  const [nip05Verified, setNip05Verified] = useState(false);
  const [linkedDisplayName, setLinkedDisplayName] = useState('');
  const [myQrOpen, setMyQrOpen] = useState(false);
  const [scanFriendOpen, setScanFriendOpen] = useState(false);
  const [imageLightboxUri, setImageLightboxUri] = useState<string | null>(null);
  const [nostrActionsExpanded, setNostrActionsExpanded] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [emailDexPanelOpen, setEmailDexPanelOpen] = useState(false);
  /** Evita fetch con modo por defecto antes de leer AsyncStorage; permite hidratar el feed en caché. */
  const [nostrSocialPrefsReady, setNostrSocialPrefsReady] = useState(false);
  const [viewedAuthor, setViewedAuthor] = useState<NostrFeedItem | null>(null);

  const qrSharePayload = useMemo(
    () => (pubHex ? encodeNprofileQrPayload(pubHex) : ''),
    [pubHex]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getNostrLinkedDisplayName().then((n) => {
        if (!cancelled) setLinkedDisplayName(n);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    const pool = new SimplePool({ enableReconnect: true });
    poolRef.current = pool;
    return () => {
      pool.destroy();
      poolRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sk = await getOrCreateNostrSecretKey();
        if (!cancelled) {
          skRef.current = sk;
          setNpub(npubFromSecret(sk));
          setPubHex(getPublicKey(sk));
        }
      } catch {
        if (!cancelled) {
          setNpub('');
          setPubHex('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [mode, fl, tag, prof] = await Promise.all([
          getNostrFeedMode(),
          getNostrFollowing(),
          getNostrHashtag(),
          getNostrLocalProfile(),
        ]);
        setFeedMode(mode);
        setFollowing(fl);
        setHashtagState(tag);
        setHashtagDraft(tag);
        setSearchTagInput(tag);
        setLocalProfile(prof);
        setProfileDraft(prof);
        const cacheKey = buildNostrFeedCacheKey(mode, fl, tag);
        const [cached, session] = await Promise.all([
          getNostrFeedCache(cacheKey),
          getNostrFeedSession(cacheKey),
        ]);
        if (cached?.length) setItems(cached);
        if (session && session.scrollOffset > 0) {
          pendingScrollRestoreRef.current = session.scrollOffset;
        }
      } finally {
        setNostrSocialPrefsReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pubHex || !localProfile.nip05 || !nip05.isNip05(localProfile.nip05)) {
        if (!cancelled) setNip05Verified(false);
        return;
      }
      try {
        const ok = await nip05.isValid(pubHex, localProfile.nip05);
        if (!cancelled) setNip05Verified(ok);
      } catch {
        if (!cancelled) setNip05Verified(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pubHex, localProfile.nip05]);

  const loadFeed = useCallback(async () => {
    if (!nostrSocialPrefsReady) return;
    const pool = poolRef.current;
    if (!pool) return;
    const cacheKey = buildNostrFeedCacheKey(feedMode, following, hashtagState);
    setLoading(true);
    setRelayHint('ok');
    try {
      const relayItems = await fetchNostrFeed(
        pool,
        DEFAULT_NOSTR_RELAYS,
        {
          mode: feedMode,
          following,
          hashtag: hashtagState,
        },
        { notesLimit: 40 }
      );

      let merged: NostrFeedItem[];
      if (feedMode === 'latest') {
        merged = mergeFeedWithSeed(NOSTR_SEED_FEED, relayItems);
      } else if (feedMode === 'hashtag') {
        merged = mergeFeedWithSeed(
          filterSeedByHashtag(NOSTR_SEED_FEED, hashtagState),
          relayItems
        );
      } else {
        merged = relayItems;
      }

      setItems(merged);
      await setNostrFeedCache(cacheKey, merged);
      await setNostrFeedSession({
        cacheKey,
        feedMode,
        hashtag: hashtagState,
        scrollOffset: scrollOffsetRef.current,
        savedAt: Date.now(),
      });
      if (relayItems.length === 0) setRelayHint('warn');
    } catch {
      const disk = await getNostrFeedCache(cacheKey);
      if (disk?.length) {
        setItems(filterDisplayableNostrFeedItems(disk));
      } else {
        setItems((prev) => mergeFeedWithSeed(NOSTR_SEED_FEED, prev));
      }
      setRelayHint('warn');
      Alert.alert('', t.loadError);
    } finally {
      setLoading(false);
    }
  }, [feedMode, following, hashtagState, nostrSocialPrefsReady, t.loadError]);

  const persistFeedSession = useCallback(
    async (offset: number) => {
      if (!nostrSocialPrefsReady) return;
      const cacheKey = buildSessionCacheKey(feedMode, following, hashtagState);
      await setNostrFeedSession({
        cacheKey,
        feedMode,
        hashtag: hashtagState,
        scrollOffset: offset,
        savedAt: Date.now(),
      });
    },
    [feedMode, following, hashtagState, nostrSocialPrefsReady]
  );

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!nostrSocialPrefsReady) return;
    let cancelled = false;
    const cacheKey = buildSessionCacheKey(feedMode, following, hashtagState);
    getNostrFeedSession(cacheKey).then((session) => {
      if (!cancelled && session && session.scrollOffset > 0) {
        pendingScrollRestoreRef.current = session.scrollOffset;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [feedMode, following, hashtagState, nostrSocialPrefsReady]);

  useEffect(() => {
    const y = pendingScrollRestoreRef.current;
    if (y == null || y <= 0 || items.length === 0) return;
    const frame = requestAnimationFrame(() => {
      feedListRef.current?.scrollToOffset({ offset: y, animated: false });
      pendingScrollRestoreRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [items, nostrSocialPrefsReady, loading]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (scrollSaveTimerRef.current) {
          clearTimeout(scrollSaveTimerRef.current);
          scrollSaveTimerRef.current = null;
        }
        void persistFeedSession(scrollOffsetRef.current);
      };
    }, [persistFeedSession])
  );

  const openWalletSheet = useCallback(async () => {
    const list = await getWalletAddresses();
    setWalletRows(list.map((w) => ({ address: w.address, chain: w.chain })));
    setValueOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setComposeOpen(false);
    setComposeText('');
    setComposeMedia([]);
  }, []);

  const removeComposeMedia = useCallback((id: string) => {
    setComposeMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const pickComposeMedia = useCallback(async () => {
    if (composeMedia.length >= MAX_COMPOSE_ATTACHMENTS) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', t.composeMediaPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_COMPOSE_ATTACHMENTS - composeMedia.length,
      quality: 0.85,
      videoMaxDuration: 180,
    });
    if (result.canceled || !result.assets?.length) return;

    const existingVideo = composeMedia.some((m) => m.kind === 'video');
    const added: ComposeDraftMedia[] = [];
    let slotVideo = existingVideo;

    for (const asset of result.assets) {
      if (composeMedia.length + added.length >= MAX_COMPOSE_ATTACHMENTS) break;
      const isVideo =
        asset.type === 'video' || (asset.mimeType ?? '').startsWith('video/');
      if (isVideo) {
        if (slotVideo) continue;
        slotVideo = true;
        added.push({
          id: `v-${Date.now()}-${added.length}`,
          localUri: asset.uri,
          kind: 'video',
        });
      } else {
        added.push({
          id: `i-${Date.now()}-${added.length}`,
          localUri: asset.uri,
          kind: 'image',
        });
      }
    }
    if (added.length) setComposeMedia((prev) => [...prev, ...added]);
  }, [composeMedia, t.composeMediaPermission]);

  const publishNote = useCallback(async () => {
    const pool = poolRef.current;
    const sk = skRef.current;
    const text = composeText.trim();
    const hasMedia = composeMedia.length > 0;
    if (!pool || !sk || (!text && !hasMedia)) {
      if (!text && !hasMedia) Alert.alert('', t.composePostNeedsContent);
      return;
    }
    if (hasMedia && !isCloudinaryConfigured()) {
      Alert.alert('', t.composeCloudinaryMissing);
      return;
    }

    setPosting(true);
    try {
      const uploaded: { kind: 'image' | 'video'; url: string }[] = [];
      for (const item of composeMedia) {
        const res = await uploadMediaToCloudinary(item.localUri, item.kind, {
          folder: 'nostr',
          tags: ['nostr', 'social-layer'],
        });
        uploaded.push({ kind: item.kind, url: res.secure_url });
      }

      const { content, tags } = buildNostrNoteFromMedia(text, uploaded);
      if (!content.trim()) {
        Alert.alert('', t.composePostNeedsContent);
        return;
      }

      const ev = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags,
          content,
        },
        sk
      );
      await pool.publish(DEFAULT_NOSTR_RELAYS, ev);
      closeCompose();
      Alert.alert('', t.posted);
      await loadFeed();
    } catch {
      Alert.alert('', composeMedia.length ? t.composeMediaFail : t.postFail);
    } finally {
      setPosting(false);
    }
  }, [
    composeText,
    composeMedia,
    closeCompose,
    loadFeed,
    t.composeCloudinaryMissing,
    t.composeMediaFail,
    t.composePostNeedsContent,
    t.postFail,
    t.posted,
  ]);

  const canPublishCompose = composeText.trim().length > 0 || composeMedia.length > 0;

  const sendLike = useCallback(
    async (item: NostrFeedItem) => {
      const pool = poolRef.current;
      const sk = skRef.current;
      if (!item.sourceEvent || !pool || !sk) {
        Alert.alert('', t.reactionNeedsRelay);
        return;
      }
      setReactingId(item.id);
      try {
        const ev = nip25.finishReactionEvent(
          { created_at: Math.floor(Date.now() / 1000) },
          item.sourceEvent,
          sk
        );
        await pool.publish(DEFAULT_NOSTR_RELAYS, ev);
        await loadFeed();
      } catch {
        Alert.alert('', t.reactionFail);
      } finally {
        setReactingId(null);
      }
    },
    [loadFeed, t.reactionFail, t.reactionNeedsRelay]
  );

  const publishProfile = useCallback(async () => {
    const pool = poolRef.current;
    const sk = skRef.current;
    if (!pool || !sk || !pubHex) return;
    const nip = profileDraft.nip05.trim();
    if (nip) {
      if (!nip05.isNip05(nip)) {
        Alert.alert('', t.nip05FormatInvalid);
        return;
      }
      try {
        const ok = await nip05.isValid(pubHex, nip);
        if (!ok) {
          Alert.alert('', t.nip05Invalid);
          return;
        }
      } catch {
        Alert.alert('', t.nip05Invalid);
        return;
      }
    }
    setPosting(true);
    try {
      const content = JSON.stringify({
        name: profileDraft.displayName.trim() || undefined,
        picture: profileDraft.pictureUrl.trim() || undefined,
        nip05: nip || undefined,
      });
      const ev = finalizeEvent(
        {
          kind: 0,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['client', 'link4deal']],
          content,
        },
        sk
      );
      await pool.publish(DEFAULT_NOSTR_RELAYS, ev);
      await setNostrLocalProfile(profileDraft);
      setLocalProfile(profileDraft);
      setProfileOpen(false);
      Alert.alert('', t.profileSaved);
    } catch {
      Alert.alert('', t.profileSaveFail);
    } finally {
      setPosting(false);
    }
  }, [profileDraft, pubHex, t.nip05FormatInvalid, t.nip05Invalid, t.profileSaveFail, t.profileSaved]);

  const copyNpub = useCallback(async () => {
    if (!npub) return;
    await Clipboard.setStringAsync(npub);
    Alert.alert('', t.copied);
  }, [npub, t.copied]);

  const copyAddress = useCallback(
    async (addr: string) => {
      await Clipboard.setStringAsync(addr);
      Alert.alert('', t.copied);
    },
    [t.copied]
  );

  const handleFriendFromQr = useCallback(
    async (pk: string) => {
      const before = await getNostrFollowing();
      const had = before.includes(pk);
      await addNostrFollowing(pk);
      setFollowing(await getNostrFollowing());
      Alert.alert('', had ? t.nostrScanAlready : t.nostrScanAdded);
    },
    [t.nostrScanAdded, t.nostrScanAlready]
  );

  const applyMode = async (mode: NostrFeedMode) => {
    setFeedMode(mode);
    await setNostrFeedMode(mode);
    if (mode === 'hashtag') {
      const h = hashtagDraft.replace(/^#/, '').trim().toLowerCase();
      setHashtagState(h);
      await setNostrHashtag(h);
    }
    setFilterOpen(false);
  };

  const addFollow = async () => {
    const pk = parseFollowPubkey(followInput);
    if (!pk) {
      Alert.alert('', t.followAddHint);
      return;
    }
    await addNostrFollowing(pk);
    const next = await getNostrFollowing();
    setFollowing(next);
    setFollowInput('');
  };

  const unfollow = async (pk: string) => {
    await removeNostrFollowing(pk);
    setFollowing(await getNostrFollowing());
  };

  const applySearchHashtag = async () => {
    const h = searchTagInput.replace(/^#/, '').trim().toLowerCase();
    setHashtagDraft(h);
    setHashtagState(h);
    await setNostrHashtag(h);
    setFeedMode('hashtag');
    await setNostrFeedMode('hashtag');
    setSearchOpen(false);
  };

  const openProfileModal = useCallback(() => {
    setProfileDraft({
      ...localProfile,
      displayName:
        localProfile.displayName.trim() ||
        linkedDisplayName.trim() ||
        '',
    });
    setProfileOpen(true);
  }, [localProfile, linkedDisplayName]);

  const bottomPad = 56 + Math.max(insets.bottom, 8);
  const headerTitle = feedTitle(feedMode, hashtagState, t);
  const displayNickname = useMemo(() => {
    const nick = localProfile.displayName.trim();
    if (nick) return nick;
    return linkedDisplayName.trim();
  }, [localProfile.displayName, linkedDisplayName]);
  const kycPanelHeight = 168;
  const identityPanelHeight = 150;
  const emailDexPanelHeight = 148;
  const configPanelHeight = 340;
  const bottomPanelExtra =
    (bottomPanelOpen && !displayNickname ? kycPanelHeight : 0) +
    (nostrActionsExpanded ? identityPanelHeight : 0) +
    (emailDexPanelOpen ? emailDexPanelHeight : 0) +
    (configPanelOpen ? configPanelHeight : 0);
  const fabBottom = bottomPad + bottomPanelExtra + 12;

  const trendingHashtags = useMemo<string[]>(() => {
    const freq: Record<string, number> = {};
    const tagRe = /#(\w{2,32})/g;
    for (const it of items) {
      let m: RegExpExecArray | null;
      while ((m = tagRe.exec(it.content)) !== null) {
        const tag = m[1].toLowerCase();
        freq[tag] = (freq[tag] ?? 0) + 1;
      }
    }
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [items]);

  const nostrBarMeta = useMemo(() => {
    const relay =
      relayHint === 'ok' ? t.nostrBarRelayOk : t.nostrBarRelayWarn;
    const name = displayNickname || t.nostrBarNoName;
    return `${relay} · ${name} · ${t.nostrBarProfileHint}`;
  }, [relayHint, displayNickname, t]);

  const toggleKycPanel = () => {
    setNostrActionsExpanded(false);
    setConfigPanelOpen(false);
    setEmailDexPanelOpen(false);
    setBottomPanelOpen((v) => !v);
  };
  const toggleIdentityPanel = () => {
    setBottomPanelOpen(false);
    setConfigPanelOpen(false);
    setEmailDexPanelOpen(false);
    setNostrActionsExpanded((v) => !v);
  };
  const toggleEmailDexPanel = () => {
    setBottomPanelOpen(false);
    setNostrActionsExpanded(false);
    setConfigPanelOpen(false);
    setEmailDexPanelOpen((v) => !v);
  };
  const toggleConfigPanel = () => {
    setBottomPanelOpen(false);
    setNostrActionsExpanded(false);
    setEmailDexPanelOpen(false);
    setConfigPanelOpen((v) => !v);
  };

  const avatarUri =
    localProfile.pictureUrl.trim() ||
    (npub ? `https://picsum.photos/seed/${npub.slice(5, 20)}/64/64` : 'https://picsum.photos/seed/nostr/64/64');

  const renderPost = useCallback(
    ({ item }: { item: NostrFeedItem }) => (
      <View style={styles.postWrap}>
        {item.repostOf ? (
          <Text style={styles.repostBanner}>
            {item.repostOf.name} · repost
          </Text>
        ) : null}
        <View style={styles.postRow}>
          <Pressable onPress={() => setViewedAuthor(item)} hitSlop={6}>
            <Image
              source={{
                uri:
                  (item.avatarUrl && item.avatarUrl.trim()) ||
                  `https://picsum.photos/seed/${item.pubkey.slice(0, 8)}/96/96`,
              }}
              style={styles.avatar}
            />
          </Pressable>
          <View style={styles.postMain}>
            <View style={styles.nameRow}>
              <Pressable onPress={() => setViewedAuthor(item)} hitSlop={6}>
                <Text style={styles.displayName} numberOfLines={1}>
                  {item.name}
                </Text>
              </Pressable>
              {item.verified ? (
                <Text style={styles.verified}> ✓</Text>
              ) : null}
              <Text style={styles.nip05} numberOfLines={1}>
                {item.nip05 ? ` ${item.nip05}` : ''}
              </Text>
              <Text style={styles.time}>
                {' · '}
                {formatRelativeTime(item.createdAt, t.now)}
              </Text>
            </View>
            <NostrContentText
              content={item.content}
              bodyStyle={styles.body}
              accentColor={palette.accent}
            />
            {item.imageUrls.map((uri) => (
              <FeedNoteImage
                key={uri}
                uri={uri}
                style={styles.embedImage}
                accessibilityLabel={t.feedImageA11y}
                onOpen={() => setImageLightboxUri(uri)}
              />
            ))}
            {item.videoUrl ? (
              <Pressable
                onPress={() => {
                  const url = item.videoUrl!;
                  Linking.openURL(url).catch(() => {});
                }}
                style={styles.videoBox}
              >
                {item.videoPosterUrl && item.videoPosterUrl.trim() ? (
                  <Image
                    source={{ uri: item.videoPosterUrl.trim() }}
                    style={styles.videoPoster}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.videoPoster, styles.videoPosterFallback]} />
                )}
                <View style={styles.videoPlay}>
                  <Text style={styles.videoPlayText}>▶</Text>
                </View>
                <Text style={styles.videoLabel}>{t.videoOpen}</Text>
              </Pressable>
            ) : null}
            <View style={styles.actions}>
              <Text style={styles.actionIcon}>💬</Text>
              <Pressable onPress={openWalletSheet} hitSlop={12}>
                <Text style={styles.actionIcon}>⚡</Text>
              </Pressable>
              <Pressable
                onPress={() => sendLike(item)}
                disabled={reactingId === item.id}
                hitSlop={10}
              >
                <Text style={styles.actionIcon}>
                  {reactingId === item.id ? '…' : '♡'} {item.likes}
                </Text>
              </Pressable>
              <Text style={styles.actionIcon}>
                ↻ {item.reposts}
              </Text>
              <Text style={styles.actionIcon}>☆</Text>
            </View>
          </View>
        </View>
      </View>
    ),
    [openWalletSheet, reactingId, sendLike, t.now, t.feedImageA11y, t.videoOpen]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style={themeDef.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            navigation.getParent()?.dispatch(DrawerActions.openDrawer())
          }
          style={styles.menuBtn}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <Pressable onPress={openProfileModal} style={styles.headerAvatarBtn}>
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
        </Pressable>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={styles.latestBtn}
        >
          <Text style={styles.latestText} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.chev}> ▾</Text>
        </Pressable>
        <Pressable style={styles.searchBtn} onPress={() => setSearchOpen(true)}>
          <Text style={styles.searchIcon}>⌕</Text>
        </Pressable>
      </View>

      <View style={styles.nostrBar}>
        <Text style={styles.nostrBarLabel}>{t.nostrBarLabel}</Text>
        <Text style={styles.nostrBarMeta} numberOfLines={1}>
          {nostrBarMeta}
        </Text>
        {nip05Verified && localProfile.nip05 ? (
          <Text style={styles.nostrBarBadge}>✓</Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={palette.muted} size="small" style={styles.nostrBarSpinner} />
        ) : null}
      </View>

      <FlatList
        ref={feedListRef}
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderPost}
        extraData={[items, reactingId]}
        onScroll={(e) => {
          scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          if (scrollSaveTimerRef.current) clearTimeout(scrollSaveTimerRef.current);
          scrollSaveTimerRef.current = setTimeout(() => {
            void persistFeedSession(scrollOffsetRef.current);
          }, 350);
        }}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            {trendingHashtags.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hashtagRow}
              >
                {trendingHashtags.map((tag) => (
                  <Pressable
                    key={`htag-${tag}`}
                    style={[
                      styles.hashtagChip,
                      hashtagState === tag && { backgroundColor: palette.accent },
                    ]}
                    onPress={() => {
                      const next = hashtagState === tag ? '' : tag;
                      setHashtagState(next);
                      void setNostrHashtag(next);
                      if (next) setFeedMode('hashtag');
                    }}
                  >
                    <Text
                      style={[
                        styles.hashtagChipText,
                        hashtagState === tag && { color: '#fff' },
                      ]}
                    >
                      #{tag}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {feedMode === 'following' && following.length === 0 ? (
              <Text style={styles.emptyHint}>{t.followingEmpty}</Text>
            ) : null}
            {items.length === 0 && feedMode === 'following' && following.length > 0 ? (
              <Text style={styles.emptyHint}>{t.noRelayNotes}</Text>
            ) : null}
          </>
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: fabBottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadFeed}
            tintColor={palette.muted}
          />
        }
      />

      <Modal
        visible={!!imageLightboxUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImageLightboxUri(null)}
      >
        <View style={styles.feedLightboxRoot}>
          <Pressable
            style={styles.feedLightboxBackdrop}
            onPress={() => setImageLightboxUri(null)}
            accessibilityLabel={t.feedImageCloseHint}
          />
          <Text style={styles.feedLightboxHint}>{t.feedImageCloseHint}</Text>
          {imageLightboxUri ? (
            <View style={styles.feedLightboxImageWrap} pointerEvents="none">
              <Image
                source={{ uri: imageLightboxUri }}
                style={styles.feedLightboxImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal visible={!!viewedAuthor} transparent animationType="fade">
        <Pressable
          style={styles.authorBackdrop}
          onPress={() => setViewedAuthor(null)}
          accessibilityRole="button"
        />
        {viewedAuthor ? (
          <View style={[styles.authorPanel, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.authorPanelHeader}>
              <Image
                source={{
                  uri:
                    (viewedAuthor.avatarUrl && viewedAuthor.avatarUrl.trim()) ||
                    `https://picsum.photos/seed/${viewedAuthor.pubkey.slice(0, 8)}/96/96`,
                }}
                style={styles.authorPanelAvatar}
              />
              <View style={styles.authorPanelMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.authorPanelName} numberOfLines={1}>
                    {viewedAuthor.name}
                  </Text>
                  {viewedAuthor.verified ? <Text style={styles.authorPanelBadge}>✓</Text> : null}
                </View>
                {viewedAuthor.nip05 ? (
                  <Text style={styles.authorPanelNip05} numberOfLines={1}>
                    {viewedAuthor.nip05}
                  </Text>
                ) : null}
                <Text style={styles.authorPanelNpub} numberOfLines={1}>
                  {viewedAuthor.pubkey.slice(0, 12)}…
                </Text>
              </View>
            </View>
            <View style={styles.authorPanelActions}>
              <Pressable
                style={[
                  styles.authorFollowBtn,
                  following.includes(viewedAuthor.pubkey) && styles.authorUnfollowBtn,
                ]}
                onPress={async () => {
                  if (!viewedAuthor) return;
                  const pk = viewedAuthor.pubkey;
                  if (following.includes(pk)) {
                    await removeNostrFollowing(pk);
                    setFollowing((prev) => prev.filter((x) => x !== pk));
                  } else {
                    await addNostrFollowing(pk);
                    setFollowing((prev) => [...prev, pk]);
                  }
                  setViewedAuthor(null);
                }}
              >
                <Text
                  style={[
                    styles.authorFollowBtnText,
                    following.includes(viewedAuthor.pubkey) && { color: palette.text },
                  ]}
                >
                  {following.includes(viewedAuthor.pubkey) ? t.unfollow : t.follow}
                </Text>
              </Pressable>
              <Pressable
                style={styles.authorDismissBtn}
                onPress={() => setViewedAuthor(null)}
              >
                <Text style={styles.authorDismissBtnText}>{t.closeModal}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>

      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => setComposeOpen(true)}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      <CollapsibleBottomPanel
        visible={bottomPanelOpen}
        bottom={bottomPad}
        backgroundUri={appBackgroundUri}
      >
          <View style={styles.bottomPanelHeader}>
            <Text style={styles.bottomPanelTitle}>
              {displayNickname ? `👤 ${displayNickname}` : t.bottomPanelTitle}
            </Text>
            <Pressable
              onPress={() => setBottomPanelOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.bottomPanelClose}>{t.bottomPanelClose} ▾</Text>
            </Pressable>
          </View>
          {displayNickname ? (
            <>
              <Text style={styles.bottomPanelHint}>{t.nostrBarProfileHint}</Text>
              <Pressable
                style={styles.bottomPanelBtn}
                onPress={() => {
                  setBottomPanelOpen(false);
                  navigation.navigate('NYC');
                }}
              >
                <Text style={styles.bottomPanelBtnText}>{t.goKyc}</Text>
              </Pressable>
              <Pressable
                style={[styles.bottomPanelBtn, styles.bottomPanelBtnSecondary]}
                onPress={() => {
                  setBottomPanelOpen(false);
                  navigation.navigate('Settings');
                }}
              >
                <Text style={[styles.bottomPanelBtnText, styles.bottomPanelBtnTextSecondary]}>
                  {t.socialConfigOpenSettings}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.bottomPanelHint}>{t.nostrNoNameHint}</Text>
              <Pressable
                style={styles.bottomPanelBtn}
                onPress={() => {
                  setBottomPanelOpen(false);
                  navigation.navigate('NYC');
                }}
              >
                <Text style={styles.bottomPanelBtnText}>{t.goKyc}</Text>
              </Pressable>
              <Pressable
                style={[styles.bottomPanelBtn, styles.bottomPanelBtnSecondary]}
                onPress={() => {
                  setBottomPanelOpen(false);
                  navigation.navigate('QuickRegister');
                }}
              >
                <Text style={[styles.bottomPanelBtnText, styles.bottomPanelBtnTextSecondary]}>
                  {t.goSignUp}
                </Text>
              </Pressable>
            </>
          )}
      </CollapsibleBottomPanel>

      <CollapsibleBottomPanel
        visible={nostrActionsExpanded}
        bottom={bottomPad}
        backgroundUri={appBackgroundUri}
      >
          <View style={styles.bottomPanelHeader}>
            <Text style={styles.bottomPanelTitle} numberOfLines={1}>
              {t.nostrActionsRowLabel}
            </Text>
            <Pressable
              onPress={() => setNostrActionsExpanded(false)}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.bottomPanelClose}>{t.bottomPanelClose} ▾</Text>
            </Pressable>
          </View>
          <View style={styles.identityBtnGrid}>
            <View style={styles.identityBtnRow}>
              <Pressable
                style={[styles.identityGridBtn, !qrSharePayload && styles.btnDisabled]}
                disabled={!qrSharePayload}
                onPress={() => {
                  setNostrActionsExpanded(false);
                  if (qrSharePayload) setMyQrOpen(true);
                }}
              >
                <Text style={styles.identityGridBtnText}>{t.nostrMyQr}</Text>
              </Pressable>
              <Pressable
                style={styles.identityGridBtn}
                onPress={() => {
                  setNostrActionsExpanded(false);
                  setScanFriendOpen(true);
                }}
              >
                <Text style={styles.identityGridBtnText}>{t.nostrScanFriend}</Text>
              </Pressable>
            </View>
            <View style={styles.identityBtnRow}>
              <Pressable
                style={styles.identityGridBtn}
                onPress={() => {
                  setNostrActionsExpanded(false);
                  copyNpub();
                }}
              >
                <Text style={styles.identityGridBtnText}>{t.copyNpub}</Text>
              </Pressable>
              <Pressable
                style={styles.identityGridBtn}
                onPress={() => {
                  setNostrActionsExpanded(false);
                  openProfileModal();
                }}
              >
                <Text style={styles.identityGridBtnText}>{t.openProfile}</Text>
              </Pressable>
            </View>
          </View>
      </CollapsibleBottomPanel>

      <CollapsibleBottomPanel
        visible={emailDexPanelOpen}
        bottom={bottomPad}
        backgroundUri={appBackgroundUri}
      >
        <View style={styles.bottomPanelHeader}>
          <Text style={styles.bottomPanelTitle}>{t.emailDexPanelTitle}</Text>
          <Pressable
            onPress={() => setEmailDexPanelOpen(false)}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={styles.bottomPanelClose}>{t.bottomPanelClose} ▾</Text>
          </Pressable>
        </View>
        <Text style={styles.bottomPanelHint}>{t.emailDexPanelSubtitle}</Text>
        <Pressable
          style={styles.bottomPanelBtn}
          onPress={() => {
            setEmailDexPanelOpen(false);
            navigation.navigate('EmailDex');
          }}
        >
          <Text style={styles.bottomPanelBtnText}>{t.emailDexOpen}</Text>
        </Pressable>
        <Pressable
          style={[styles.bottomPanelBtn, styles.bottomPanelBtnSecondary]}
          onPress={() => {
            setEmailDexPanelOpen(false);
            Linking.openURL('https://app.nostrmail.org').catch(() => {});
          }}
        >
          <Text style={[styles.bottomPanelBtnText, styles.bottomPanelBtnTextSecondary]}>
            {t.emailDexOpenNmail}
          </Text>
        </Pressable>
      </CollapsibleBottomPanel>

      <CollapsibleBottomPanel
        visible={configPanelOpen}
        bottom={bottomPad}
        backgroundUri={appBackgroundUri}
        style={styles.bottomPanelConfig}
      >
          <View style={styles.bottomPanelHeader}>
            <Text style={styles.bottomPanelTitle}>{t.socialConfigPanelTitle}</Text>
            <Pressable
              onPress={() => setConfigPanelOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.bottomPanelClose}>{t.bottomPanelClose} ▾</Text>
            </Pressable>
          </View>
          <Text style={styles.bottomPanelConfigSubtitle}>{t.paid402Title}</Text>
          <ScrollView
            style={styles.bottomPanelConfigScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PaidContent402Panel language={language} embedded appTheme={appTheme} />
          </ScrollView>
          <Pressable
            style={[styles.bottomPanelBtn, styles.bottomPanelBtnSecondary, styles.bottomPanelConfigSettingsBtn]}
            onPress={() => {
              setConfigPanelOpen(false);
              navigation.navigate('Settings');
            }}
          >
            <Text style={[styles.bottomPanelBtnText, styles.bottomPanelBtnTextSecondary]}>
              {t.socialConfigOpenSettings}
            </Text>
          </Pressable>
      </CollapsibleBottomPanel>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navLabel}>{language === 'es' ? 'Inicio' : 'Home'}</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={toggleKycPanel}
          accessibilityRole="button"
          accessibilityState={{ expanded: bottomPanelOpen }}
        >
          <Text style={[styles.navIcon, bottomPanelOpen && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navLabel, bottomPanelOpen && { color: palette.accent }]}>
            {language === 'es' ? 'Cuenta' : 'Account'}
          </Text>
        </Pressable>
        <Pressable
          style={styles.navCenter}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.navCenterIcon}>⚡</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={toggleIdentityPanel}
          accessibilityRole="button"
          accessibilityLabel={t.nostrActionsRowLabel}
          accessibilityState={{ expanded: nostrActionsExpanded }}
        >
          <Text style={[styles.navIcon, nostrActionsExpanded && styles.navIconActive]}>◔</Text>
          <Text style={[styles.navLabel, nostrActionsExpanded && { color: palette.accent }]}>
            Nostr
          </Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={toggleEmailDexPanel}
          accessibilityRole="button"
          accessibilityLabel={t.emailDexPanelTitle}
          accessibilityState={{ expanded: emailDexPanelOpen }}
        >
          <Text style={[styles.navIcon, emailDexPanelOpen && styles.navIconActive]}>✉</Text>
          <Text style={[styles.navLabel, emailDexPanelOpen && { color: palette.accent }]}>Mail</Text>
        </Pressable>
        <Pressable
          style={styles.navItem}
          onPress={toggleConfigPanel}
          accessibilityRole="button"
          accessibilityLabel={t.socialConfigPanelTitle}
          accessibilityState={{ expanded: configPanelOpen }}
        >
          <Text style={[styles.navIcon, configPanelOpen && styles.navIconActive]}>◎</Text>
          <Text style={[styles.navLabel, configPanelOpen && { color: palette.accent }]}>
            {language === 'es' ? 'Config' : 'Config'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={filterOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
          <View
            onStartShouldSetResponder={() => true}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>{t.filterTitle}</Text>
            <Pressable
              style={styles.filterRow}
              onPress={() => applyMode('latest')}
            >
              <Text style={styles.filterRowText}>{t.filterLatest}</Text>
            </Pressable>
            <Pressable
              style={styles.filterRow}
              onPress={() => applyMode('following')}
            >
              <Text style={styles.filterRowText}>{t.filterFollowing}</Text>
            </Pressable>
            <Text style={styles.modalHint}>{t.hashtagPlaceholder}</Text>
            <TextInput
              value={hashtagDraft}
              onChangeText={setHashtagDraft}
              placeholder={t.hashtagPlaceholder}
              placeholderTextColor={palette.muted}
              style={styles.smallInput}
              autoCapitalize="none"
            />
            <Pressable
              style={styles.btnPrimary}
              onPress={() => applyMode('hashtag')}
            >
              <Text style={styles.btnPrimaryText}>{t.applyFilter}</Text>
            </Pressable>
            <Text style={[styles.modalHint, { marginTop: 16 }]}>
              {t.followAddHint}
            </Text>
            <TextInput
              value={followInput}
              onChangeText={setFollowInput}
              placeholder={t.followAddHint}
              placeholderTextColor={palette.muted}
              style={styles.smallInput}
              autoCapitalize="none"
            />
            <Pressable style={styles.btnPrimary} onPress={addFollow}>
              <Text style={styles.btnPrimaryText}>{t.followAdd}</Text>
            </Pressable>
            <ScrollView style={styles.followList} nestedScrollEnabled>
              {following.map((pk) => (
                <View key={pk} style={styles.followRow}>
                  <Text style={styles.followPk} numberOfLines={1}>
                    {pk.slice(0, 12)}…{pk.slice(-8)}
                  </Text>
                  <Pressable onPress={() => unfollow(pk)}>
                    <Text style={styles.followRemove}>{t.followRemove}</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setFilterOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>{t.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={searchOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setSearchOpen(false)}>
          <View
            onStartShouldSetResponder={() => true}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>{t.searchTitle}</Text>
            <TextInput
              value={searchTagInput}
              onChangeText={setSearchTagInput}
              placeholder={t.hashtagPlaceholder}
              placeholderTextColor={palette.muted}
              style={styles.smallInput}
              autoCapitalize="none"
            />
            <Pressable style={styles.btnPrimary} onPress={applySearchHashtag}>
              <Text style={styles.btnPrimaryText}>{t.searchApply}</Text>
            </Pressable>
            <Pressable onPress={() => setSearchOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>{t.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={composeOpen} transparent animationType="slide">
        <View style={styles.composeBackdrop}>
          <View style={[styles.composeCard, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.composeTitle}>{t.compose}</Text>
            <Text style={styles.composeHint}>{t.composeHint}</Text>
            <TextInput
              value={composeText}
              onChangeText={setComposeText}
              placeholder={t.composeHint}
              placeholderTextColor={palette.muted}
              multiline
              style={styles.composeInput}
            />
            <Pressable
              onPress={pickComposeMedia}
              disabled={posting || composeMedia.length >= MAX_COMPOSE_ATTACHMENTS}
              style={[
                styles.composeAttachBtn,
                (posting || composeMedia.length >= MAX_COMPOSE_ATTACHMENTS) &&
                  styles.btnDisabled,
              ]}
            >
              <Text style={styles.composeAttachBtnText}>📎 {t.composeAddMedia}</Text>
            </Pressable>
            {composeMedia.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.composeMediaScroll}
                contentContainerStyle={styles.composeMediaRow}
              >
                {composeMedia.map((m) => (
                  <View key={m.id} style={styles.composeMediaItem}>
                    {m.kind === 'image' ? (
                      <Image source={{ uri: m.localUri }} style={styles.composeMediaThumb} />
                    ) : (
                      <View style={[styles.composeMediaThumb, styles.composeVideoThumb]}>
                        <Text style={styles.composeVideoIcon}>▶</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => removeComposeMedia(m.id)}
                      style={styles.composeMediaRemove}
                      hitSlop={8}
                      accessibilityLabel={t.composeRemoveMedia}
                    >
                      <Text style={styles.composeMediaRemoveText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
            {posting && composeMedia.length > 0 ? (
              <Text style={styles.composeUploadingLabel}>{t.composeUploadingMedia}</Text>
            ) : null}
            <View style={styles.composeActions}>
              <Pressable onPress={closeCompose} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={publishNote}
                disabled={posting || !canPublishCompose}
                style={[
                  styles.btnPrimary,
                  (posting || !canPublishCompose) && styles.btnDisabled,
                ]}
              >
                <Text style={styles.btnPrimaryText}>
                  {posting ? t.posting : t.post}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={profileOpen} transparent animationType="slide">
        <View style={styles.composeBackdrop}>
          <ScrollView
            style={{ maxHeight: '88%' }}
            contentContainerStyle={[
              styles.composeCard,
              { paddingBottom: insets.bottom + 16 },
            ]}
          >
            <Text style={styles.composeTitle}>{t.profileTitle}</Text>
            <Text style={styles.composeHint}>{t.profileNickname}</Text>
            <Text style={styles.composeMicroHint}>{t.profileNicknameHint}</Text>
            <TextInput
              value={profileDraft.displayName}
              onChangeText={(v) =>
                setProfileDraft((p) => ({ ...p, displayName: v }))
              }
              placeholder={t.profileNickname}
              placeholderTextColor={palette.muted}
              style={styles.smallInput}
            />
            <Text style={styles.composeHint}>{t.profilePicture}</Text>
            <TextInput
              value={profileDraft.pictureUrl}
              onChangeText={(v) =>
                setProfileDraft((p) => ({ ...p, pictureUrl: v }))
              }
              placeholder="https://…"
              placeholderTextColor={palette.muted}
              style={styles.smallInput}
              autoCapitalize="none"
            />
            <Text style={styles.composeHint}>{t.profileNip05}</Text>
            <TextInput
              value={profileDraft.nip05}
              onChangeText={(v) =>
                setProfileDraft((p) => ({ ...p, nip05: v }))
              }
              placeholder="you@domain.com"
              placeholderTextColor={palette.muted}
              style={styles.smallInput}
              autoCapitalize="none"
            />
            <View style={styles.composeActions}>
              <Pressable onPress={() => setProfileOpen(false)} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={publishProfile}
                disabled={posting}
                style={[styles.btnPrimary, posting && styles.btnDisabled]}
              >
                <Text style={styles.btnPrimaryText}>
                  {posting ? t.posting : t.profileSave}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={valueOpen} transparent animationType="slide">
        <View style={styles.composeBackdrop}>
          <View style={[styles.composeCard, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.composeTitle}>{t.valueTitle}</Text>
            <Text style={styles.modalHint}>{t.valueBody}</Text>
            {walletRows.length === 0 ? (
              <Text style={styles.modalHint}>{t.noWalletAddresses}</Text>
            ) : (
              walletRows.map((w) => (
                <View key={w.address + (w.chain ?? '')} style={styles.walletRow}>
                  <Text style={styles.walletChain}>{chainLabel(w.chain)}</Text>
                  <Text style={styles.walletAddr} numberOfLines={1}>
                    {formatAddressForUi(w.address, revealWalletAddresses)}
                  </Text>
                  <Pressable
                    onPress={() => copyAddress(w.address)}
                    style={styles.copyChip}
                  >
                    <Text style={styles.copyChipText}>{t.copyAddress}</Text>
                  </Pressable>
                </View>
              ))
            )}
            <Pressable
              onPress={() => {
                setValueOpen(false);
                navigation.navigate('Wallet');
              }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>{t.goWallet}</Text>
            </Pressable>
            <Pressable onPress={() => setValueOpen(false)} style={styles.btnGhost}>
              <Text style={styles.btnGhostText}>{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={myQrOpen} transparent animationType="fade">
        <Pressable style={styles.myQrBackdrop} onPress={() => setMyQrOpen(false)}>
          <View
            onStartShouldSetResponder={() => true}
            style={styles.myQrCard}
          >
            <Text style={styles.myQrTitle}>{t.nostrMyQrTitle}</Text>
            {displayNickname ? (
              <Text style={styles.myQrName} numberOfLines={2}>
                {displayNickname}
              </Text>
            ) : null}
            {qrSharePayload ? (
              <View style={styles.myQrQrWrap}>
                <QRCode value={qrSharePayload} size={220} color="#000000" backgroundColor="#ffffff" />
              </View>
            ) : null}
            {npub ? (
              <Text style={styles.myQrNpubHint} selectable numberOfLines={2}>
                npub · {npub.slice(0, 18)}…{npub.slice(-12)}
              </Text>
            ) : null}
            <Pressable onPress={() => setMyQrOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>{t.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <NostrFriendQrScanModal
        visible={scanFriendOpen}
        onClose={() => setScanFriendOpen(false)}
        title={t.nostrScanTitle}
        grantCameraLabel={t.nostrScanGrantCamera}
        cameraDeniedLabel={t.nostrScanDenied}
        decode={parseNostrPubkeyFromQrPayload}
        onInvalidPayload={() => Alert.alert('', t.nostrScanInvalid)}
        onDecodedPubkey={(pk) => {
          void handleFriendFromQr(pk);
        }}
      />
    </View>
  );
}

function createNetworkP2PStyles(c: SocialLayerColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  menuBtn: { paddingRight: 8, paddingVertical: 4 },
  menuIcon: { color: c.text, fontSize: 22, fontWeight: '600' },
  headerAvatarBtn: { marginRight: 10 },
  headerAvatar: { width: 34, height: 34, borderRadius: 17 },
  latestBtn: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  latestText: { color: c.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  chev: { color: c.muted, fontSize: 14 },
  searchBtn: { padding: 8 },
  searchIcon: { color: c.text, fontSize: 20 },
  nostrBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: c.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
    gap: 8,
  },
  nostrBarLabel: {
    color: c.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  nostrBarMeta: {
    flex: 1,
    color: c.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  nostrBarBadge: { color: c.accent, fontSize: 11, fontWeight: '700' },
  nostrBarSpinner: { marginLeft: 2 },
  configThemeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  configThemeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  configThemeChipActive: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },
  configThemeChipText: { color: '#f5f5f5', fontSize: 12, fontWeight: '600' },
  configThemeChipTextActive: { color: '#fff' },
  identityBtnGrid: { marginTop: 4 },
  identityBtnRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  identityGridBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityGridBtnText: {
    color: c.accent,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  copyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.line,
  },
  copyChipSpaced: { marginRight: 8 },
  copyChipText: { color: c.accent, fontSize: 12, fontWeight: '600' },
  emptyHint: {
    color: c.muted,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 58 },
  postWrap: { paddingVertical: 12, paddingHorizontal: 12 },
  repostBanner: { color: c.muted, fontSize: 12, marginBottom: 6, marginLeft: 46 },
  postRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  postMain: { flex: 1 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  displayName: { color: c.text, fontSize: 15, fontWeight: '700' },
  verified: { color: c.accent, fontSize: 14 },
  nip05: { color: c.muted, fontSize: 13, flexShrink: 1 },
  time: { color: c.muted, fontSize: 13 },
  body: { color: c.text, fontSize: 15, lineHeight: 21, marginTop: 4 },
  embedImage: {
    marginTop: 10,
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 10,
    backgroundColor: c.surface,
  },
  videoBox: { marginTop: 10, borderRadius: 10, overflow: 'hidden' },
  videoPoster: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.surface },
  videoPosterFallback: { backgroundColor: c.elevated },
  videoPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayText: {
    color: c.text,
    fontSize: 28,
    opacity: 0.95,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoLabel: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    color: c.muted,
    fontSize: 11,
  },
  feedLightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedLightboxBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  feedLightboxHint: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    textAlign: 'center',
    color: c.muted,
    fontSize: 13,
    zIndex: 2,
  },
  feedLightboxImageWrap: {
    width: SCREEN_W,
    flex: 1,
    maxHeight: SCREEN_H * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  feedLightboxImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.78,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  actionIcon: { color: c.muted, fontSize: 15, marginRight: 18 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  bottomPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bottomPanelTitle: {
    color: '#f5f5f5',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPanelClose: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPanelHint: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  bottomPanelBtn: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomPanelBtnSecondary: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bottomPanelBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPanelBtnTextSecondary: {
    color: '#f5f5f5',
  },
  bottomPanelConfig: {
    maxHeight: '52%',
    paddingBottom: 8,
  },
  bottomPanelConfigSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  bottomPanelConfigScroll: {
    maxHeight: 220,
    marginBottom: 8,
  },
  bottomPanelConfigSettingsBtn: {
    marginBottom: 0,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    backgroundColor: c.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.line,
    zIndex: 21,
  },
  navItem: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, alignItems: 'center' },
  navIcon: { color: c.muted, fontSize: 20 },
  navIconActive: { color: c.accent },
  navLabel: { color: c.muted, fontSize: 9, marginTop: 2, textAlign: 'center' },
  navCenter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navCenterIcon: { color: c.text, fontSize: 22 },
  myQrBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  myQrCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
  },
  myQrTitle: { color: c.text, fontSize: 17, fontWeight: '700' },
  myQrName: { color: c.muted, fontSize: 14, marginTop: 8, textAlign: 'center' },
  myQrQrWrap: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  myQrNpubHint: { color: c.muted, fontSize: 11, marginTop: 12, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: c.line,
    maxHeight: '80%',
  },
  modalTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  modalHint: { color: c.muted, fontSize: 14, marginTop: 10, lineHeight: 20 },
  filterRow: {
    marginTop: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  filterRowText: { color: c.text, fontSize: 16 },
  smallInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
    color: c.text,
    fontSize: 15,
  },
  followList: { maxHeight: 160, marginTop: 12 },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  followPk: { color: c.muted, fontSize: 12, flex: 1, marginRight: 8 },
  followRemove: { color: c.accent, fontSize: 13, fontWeight: '600' },
  modalClose: { marginTop: 16, alignSelf: 'flex-end' },
  modalCloseText: { color: c.accent, fontSize: 15, fontWeight: '600' },
  composeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  composeCard: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: c.line,
  },
  composeTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  composeHint: { color: c.muted, fontSize: 13, marginTop: 6 },
  composeMicroHint: { color: c.muted, fontSize: 11, marginTop: 4, lineHeight: 15 },
  composeInput: {
    marginTop: 12,
    minHeight: 120,
    color: c.text,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    padding: 12,
  },
  composeAttachBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.elevated,
  },
  composeAttachBtnText: {
    color: c.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  composeMediaScroll: { marginTop: 10, maxHeight: 96 },
  composeMediaRow: { gap: 10, paddingRight: 8 },
  composeMediaItem: { position: 'relative' },
  composeMediaThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: c.elevated,
  },
  composeVideoThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeVideoIcon: { color: c.text, fontSize: 22 },
  composeMediaRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c62828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeMediaRemoveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  composeUploadingLabel: {
    color: c.muted,
    fontSize: 12,
    marginTop: 8,
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 },
  btnGhostText: { color: c.muted, fontSize: 15 },
  btnPrimary: {
    backgroundColor: c.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  walletRow: {
    marginTop: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  walletChain: { color: c.text, fontWeight: '700', fontSize: 14 },
  walletAddr: { color: c.muted, fontSize: 13, marginTop: 4 },
  hashtagRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  hashtagChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
  },
  hashtagChipText: {
    fontSize: 13,
    color: c.accent,
    fontWeight: '600',
  },
  authorBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  authorPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  authorPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  authorPanelAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  authorPanelMeta: {
    flex: 1,
    gap: 2,
  },
  authorPanelName: {
    fontSize: 17,
    fontWeight: '700',
    color: c.text,
  },
  authorPanelBadge: {
    fontSize: 14,
    color: c.accent,
    fontWeight: '700',
  },
  authorPanelNip05: {
    fontSize: 13,
    color: c.accent,
  },
  authorPanelNpub: {
    fontSize: 11,
    color: c.muted,
    fontFamily: 'monospace',
  },
  authorPanelActions: {
    flexDirection: 'row',
    gap: 10,
  },
  authorFollowBtn: {
    flex: 1,
    backgroundColor: c.accent,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  authorUnfollowBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: c.line,
  },
  authorFollowBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  authorDismissBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorDismissBtnText: {
    color: c.muted,
    fontSize: 15,
  },
  });
}
