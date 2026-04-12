import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  fetchNostrFeed,
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
import NostrFriendQrScanModal from '../components/NostrFriendQrScanModal';

const BG = '#000000';
const SURFACE = '#0c0c0c';
const LINE = '#1c1c1c';
const TEXT = '#f2f2f2';
const MUTED = '#7a7a7a';
const ACCENT = '#1d9bf0';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NetworkP2P'>;

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

export default function NetworkP2PScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { language } = useSettings();
  const { revealWalletAddresses } = useVerificationAccess();
  const t = useMemo(() => getNetworkP2PStrings(language), [language]);

  const poolRef = useRef<SimplePool | null>(null);
  const skRef = useRef<Uint8Array | null>(null);

  const [npub, setNpub] = useState('');
  const [pubHex, setPubHex] = useState('');
  const [items, setItems] = useState<NostrFeedItem[]>(NOSTR_SEED_FEED);
  const [loading, setLoading] = useState(false);
  const [relayHint, setRelayHint] = useState<'ok' | 'warn'>('ok');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
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
    const pool = poolRef.current;
    if (!pool) return;
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
      if (relayItems.length === 0) setRelayHint('warn');
    } catch {
      setItems((prev) => mergeFeedWithSeed(NOSTR_SEED_FEED, prev));
      setRelayHint('warn');
      Alert.alert('', t.loadError);
    } finally {
      setLoading(false);
    }
  }, [feedMode, following, hashtagState, t.loadError]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const openWalletSheet = useCallback(async () => {
    const list = await getWalletAddresses();
    setWalletRows(list.map((w) => ({ address: w.address, chain: w.chain })));
    setValueOpen(true);
  }, []);

  const publishNote = useCallback(async () => {
    const pool = poolRef.current;
    const sk = skRef.current;
    const text = composeText.trim();
    if (!pool || !sk || !text) return;
    setPosting(true);
    try {
      const ev = finalizeEvent(
        {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: text,
        },
        sk
      );
      await pool.publish(DEFAULT_NOSTR_RELAYS, ev);
      setComposeText('');
      setComposeOpen(false);
      Alert.alert('', t.posted);
      await loadFeed();
    } catch {
      Alert.alert('', t.postFail);
    } finally {
      setPosting(false);
    }
  }, [composeText, loadFeed, t.postFail, t.posted]);

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
  const fabBottom = bottomPad + 12;
  const headerTitle = feedTitle(feedMode, hashtagState, t);
  const displayNickname = useMemo(() => {
    const nick = localProfile.displayName.trim();
    if (nick) return nick;
    return linkedDisplayName.trim();
  }, [localProfile.displayName, linkedDisplayName]);

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
          <Image
            source={{
              uri:
                item.avatarUrl ??
                `https://picsum.photos/seed/${item.pubkey.slice(0, 8)}/96/96`,
            }}
            style={styles.avatar}
          />
          <View style={styles.postMain}>
            <View style={styles.nameRow}>
              <Text style={styles.displayName} numberOfLines={1}>
                {item.name}
              </Text>
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
            <Text style={styles.body}>{item.content}</Text>
            {item.imageUrls.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.embedImage}
                resizeMode="cover"
              />
            ))}
            {item.videoUrl ? (
              <Pressable
                onPress={() => Linking.openURL(item.videoUrl!)}
                style={styles.videoBox}
              >
                {item.videoPosterUrl ? (
                  <Image
                    source={{ uri: item.videoPosterUrl }}
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
    [openWalletSheet, reactingId, sendLike, t.now, t.videoOpen]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
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

      <View style={styles.identityBar}>
        <View style={styles.identityRow}>
          <Text style={styles.identityLabel}>{t.nostrIdentityLabel}</Text>
          {nip05Verified && localProfile.nip05 ? (
            <Text style={styles.verifiedBadge}> NIP-05 ✓</Text>
          ) : null}
        </View>
        <Text style={styles.identityName} numberOfLines={2}>
          {displayNickname || t.nostrNoNameHint}
        </Text>
        <Text style={styles.identitySubline}>{t.nostrSubline}</Text>
        <View style={styles.identityBtnGrid}>
          <View style={styles.identityBtnRow}>
            <Pressable
              style={[styles.identityGridBtn, !qrSharePayload && styles.btnDisabled]}
              disabled={!qrSharePayload}
              onPress={() => qrSharePayload && setMyQrOpen(true)}
            >
              <Text style={styles.identityGridBtnText}>{t.nostrMyQr}</Text>
            </Pressable>
            <Pressable
              style={styles.identityGridBtn}
              onPress={() => setScanFriendOpen(true)}
            >
              <Text style={styles.identityGridBtnText}>{t.nostrScanFriend}</Text>
            </Pressable>
          </View>
          <View style={styles.identityBtnRow}>
            <Pressable style={styles.identityGridBtn} onPress={copyNpub}>
              <Text style={styles.identityGridBtnText}>{t.copyNpub}</Text>
            </Pressable>
            <Pressable style={styles.identityGridBtn} onPress={openProfileModal}>
              <Text style={styles.identityGridBtnText}>{t.openProfile}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.relayBar}>
        <Text style={styles.relayText}>
          {t.relayStatus}: {relayHint === 'ok' ? t.relayOk : t.relayWarn}
        </Text>
        {loading ? <ActivityIndicator color={MUTED} size="small" /> : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderPost}
        extraData={[items, reactingId]}
        ListHeaderComponent={
          <>
            {feedMode === 'following' && following.length === 0 ? (
              <Text style={styles.emptyHint}>{t.followingEmpty}</Text>
            ) : null}
            {items.length === 0 && feedMode === 'following' && following.length > 0 ? (
              <Text style={styles.emptyHint}>{t.noRelayNotes}</Text>
            ) : null}
            <PaidContent402Panel language={language} />
          </>
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: fabBottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadFeed}
            tintColor={MUTED}
          />
        }
      />

      <Pressable
        style={[styles.fab, { bottom: fabBottom }]}
        onPress={() => setComposeOpen(true)}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>⌂</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>☰</Text>
        </Pressable>
        <Pressable
          style={styles.navCenter}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.navCenterIcon}>⚡</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>◔</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>◎</Text>
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
              placeholderTextColor={MUTED}
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
              placeholderTextColor={MUTED}
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
              placeholderTextColor={MUTED}
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
              placeholderTextColor={MUTED}
              multiline
              style={styles.composeInput}
            />
            <View style={styles.composeActions}>
              <Pressable onPress={() => setComposeOpen(false)} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={publishNote}
                disabled={posting || !composeText.trim()}
                style={[
                  styles.btnPrimary,
                  (posting || !composeText.trim()) && styles.btnDisabled,
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
              placeholderTextColor={MUTED}
              style={styles.smallInput}
            />
            <Text style={styles.composeHint}>{t.profilePicture}</Text>
            <TextInput
              value={profileDraft.pictureUrl}
              onChangeText={(v) =>
                setProfileDraft((p) => ({ ...p, pictureUrl: v }))
              }
              placeholder="https://…"
              placeholderTextColor={MUTED}
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
              placeholderTextColor={MUTED}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  menuBtn: { paddingRight: 8, paddingVertical: 4 },
  menuIcon: { color: TEXT, fontSize: 22, fontWeight: '600' },
  headerAvatarBtn: { marginRight: 10 },
  headerAvatar: { width: 34, height: 34, borderRadius: 17 },
  latestBtn: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  latestText: { color: TEXT, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  chev: { color: MUTED, fontSize: 14 },
  searchBtn: { padding: 8 },
  searchIcon: { color: TEXT, fontSize: 20 },
  identityBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  identityLabel: { color: MUTED, fontSize: 11, letterSpacing: 0.5 },
  verifiedBadge: { color: ACCENT, fontSize: 11, fontWeight: '600' },
  identityName: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    lineHeight: 24,
  },
  identitySubline: { color: MUTED, fontSize: 11, marginTop: 6, lineHeight: 16 },
  identityBtnGrid: { marginTop: 10 },
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
    borderColor: LINE,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityGridBtnText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  copyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
  },
  copyChipSpaced: { marginRight: 8 },
  copyChipText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
  relayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  relayText: { color: MUTED, fontSize: 12 },
  emptyHint: {
    color: MUTED,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: LINE, marginLeft: 58 },
  postWrap: { paddingVertical: 12, paddingHorizontal: 12 },
  repostBanner: { color: MUTED, fontSize: 12, marginBottom: 6, marginLeft: 46 },
  postRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  postMain: { flex: 1 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  displayName: { color: TEXT, fontSize: 15, fontWeight: '700' },
  verified: { color: ACCENT, fontSize: 14 },
  nip05: { color: MUTED, fontSize: 13, flexShrink: 1 },
  time: { color: MUTED, fontSize: 13 },
  body: { color: TEXT, fontSize: 15, lineHeight: 21, marginTop: 4 },
  embedImage: {
    marginTop: 10,
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 10,
    backgroundColor: SURFACE,
  },
  videoBox: { marginTop: 10, borderRadius: 10, overflow: 'hidden' },
  videoPoster: { width: '100%', aspectRatio: 16 / 9, backgroundColor: SURFACE },
  videoPosterFallback: { backgroundColor: '#111' },
  videoPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayText: {
    color: TEXT,
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
    color: MUTED,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  actionIcon: { color: MUTED, fontSize: 15, marginRight: 18 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    backgroundColor: BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  navItem: { padding: 10 },
  navIcon: { color: MUTED, fontSize: 22 },
  navCenter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  navCenterIcon: { color: TEXT, fontSize: 22 },
  myQrBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  myQrCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
  },
  myQrTitle: { color: TEXT, fontSize: 17, fontWeight: '700' },
  myQrName: { color: MUTED, fontSize: 14, marginTop: 8, textAlign: 'center' },
  myQrQrWrap: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  myQrNpubHint: { color: MUTED, fontSize: 11, marginTop: 12, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: LINE,
    maxHeight: '80%',
  },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
  modalHint: { color: MUTED, fontSize: 14, marginTop: 10, lineHeight: 20 },
  filterRow: {
    marginTop: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  filterRowText: { color: TEXT, fontSize: 16 },
  smallInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    padding: 12,
    color: TEXT,
    fontSize: 15,
  },
  followList: { maxHeight: 160, marginTop: 12 },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  followPk: { color: MUTED, fontSize: 12, flex: 1, marginRight: 8 },
  followRemove: { color: ACCENT, fontSize: 13, fontWeight: '600' },
  modalClose: { marginTop: 16, alignSelf: 'flex-end' },
  modalCloseText: { color: ACCENT, fontSize: 15, fontWeight: '600' },
  composeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  composeCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: LINE,
  },
  composeTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
  composeHint: { color: MUTED, fontSize: 13, marginTop: 6 },
  composeMicroHint: { color: MUTED, fontSize: 11, marginTop: 4, lineHeight: 15 },
  composeInput: {
    marginTop: 12,
    minHeight: 120,
    color: TEXT,
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    padding: 12,
  },
  composeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 },
  btnGhostText: { color: MUTED, fontSize: 15 },
  btnPrimary: {
    backgroundColor: ACCENT,
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
    borderBottomColor: LINE,
  },
  walletChain: { color: TEXT, fontWeight: '700', fontSize: 14 },
  walletAddr: { color: MUTED, fontSize: 13, marginTop: 4 },
});
