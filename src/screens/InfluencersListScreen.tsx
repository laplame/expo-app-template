/**
 * Feed influencers estilo Pinterest: dos columnas, masonry balanceado,
 * promociones intercaladas. Layout con React Native (sin Gluestack en el contenedor)
 * para evitar errores de runtime con tokens/tema en algunos entornos Hermes.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StyleSheet,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../context/SettingsContext';
import InfluencerCard from '../components/InfluencerCard';
import PromotionCard from '../components/PromotionCard';
import { getAllInfluencers, type InfluencerDoc } from '../services/influencersApi';
import {
  getPromotions,
  type ApiPromotionDoc,
  SITE_PROMO_URLS,
} from '../services/promotionsApi';
import { getInfluencerVotes, setInfluencerVote } from '../services/storage';
import { getInfluencersFeedStrings } from '../i18n/uiStrings';

type FeedItem =
  | { kind: 'influencer'; inf: InfluencerDoc; key: string }
  | { kind: 'promotion'; doc: ApiPromotionDoc; key: string };

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function aspectRatioForFeedKey(key: string): number {
  const steps = [0.68, 0.72, 0.78, 0.82, 0.88, 0.92, 1.0, 1.06];
  return steps[hashString(key) % steps.length];
}

function promoImageHeightForKey(key: string): number {
  return 108 + (hashString(key) % 96);
}

function interleaveWithPromotions(
  influencers: InfluencerDoc[],
  promotions: ApiPromotionDoc[],
  every: number,
  options?: { leadPromo?: boolean }
): FeedItem[] {
  const items: FeedItem[] = [];
  let promoIdx = 0;
  if (options?.leadPromo && promotions.length > 0) {
    items.push({
      kind: 'promotion',
      doc: promotions[0],
      key: 'promo-feed-lead',
    });
    promoIdx = 1;
  }
  influencers.forEach((inf, i) => {
    const id = inf._id ?? inf.id ?? `i${i}`;
    items.push({ kind: 'influencer', inf, key: `inf-${id}` });
    if (promotions.length > 0 && (i + 1) % every === 0) {
      const doc = promotions[promoIdx % promotions.length];
      items.push({
        kind: 'promotion',
        doc,
        key: `promo-${doc._id}-${promoIdx}-${i}`,
      });
      promoIdx += 1;
    }
  });
  return items;
}

function estimateItemHeight(it: FeedItem, columnWidth: number): number {
  if (it.kind === 'promotion') {
    const img = promoImageHeightForKey(it.key);
    return img + 200;
  }
  const ar = aspectRatioForFeedKey(it.key);
  const imageH = columnWidth / ar;
  return imageH + 210;
}

function splitIntoTwoColumns(
  items: FeedItem[],
  columnWidth: number
): { left: FeedItem[]; right: FeedItem[] } {
  const left: FeedItem[] = [];
  const right: FeedItem[] = [];
  let hLeft = 0;
  let hRight = 0;
  for (const it of items) {
    const h = estimateItemHeight(it, columnWidth);
    if (hLeft <= hRight) {
      left.push(it);
      hLeft += h;
    } else {
      right.push(it);
      hRight += h;
    }
  }
  return { left, right };
}

const GREEN = '#00704A';
const BG = '#f4f6f8';

export default function InfluencersListScreen() {
  const { language } = useSettings();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [win, setWin] = useState(() => Dimensions.get('window'));
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWin(window));
    return () => sub.remove();
  }, []);

  const [influencers, setInfluencers] = useState<InfluencerDoc[]>([]);
  const [promotions, setPromotions] = useState<ApiPromotionDoc[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const [listRes, promoRes, votes] = await Promise.all([
      getAllInfluencers({ limit: 50 }),
      getPromotions({ limit: 24, status: 'active' }),
      getInfluencerVotes(),
    ]);
    if (listRes.ok) {
      setInfluencers(listRes.influencers ?? []);
    } else {
      setError(listRes.error ?? getInfluencersFeedStrings(language).errorFallback);
      setInfluencers([]);
    }
    if (promoRes.ok && promoRes.docs?.length) {
      setPromotions(promoRes.docs);
    } else {
      setPromotions([]);
    }
    setVotedIds(new Set(votes));
    setLoading(false);
    setRefreshing(false);
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    void loadData(true);
  }, [loadData]);

  const toggleVote = useCallback(async (inf: InfluencerDoc) => {
    const id = inf._id ?? inf.id ?? '';
    if (!id) return;
    const currentlyVoted = votedIds.has(id);
    const nextVoted = !currentlyVoted;
    await setInfluencerVote(id, nextVoted);
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (nextVoted) next.add(id);
      else next.delete(id);
      return next;
    });
  }, [votedIds]);

  const horizontalPad = 14;
  const columnGap = 11;

  const columnWidth = useMemo(
    () => Math.max(120, (win.width - horizontalPad * 2 - columnGap) / 2),
    [win.width]
  );

  const feedItems = useMemo(
    () => interleaveWithPromotions(influencers, promotions, 3, { leadPromo: promotions.length > 0 }),
    [influencers, promotions]
  );

  const { left, right } = useMemo(
    () => splitIntoTwoColumns(feedItems, columnWidth),
    [feedItems, columnWidth]
  );

  const t = useMemo(() => getInfluencersFeedStrings(language), [language]);

  const openPromotionUrl = useCallback((doc: ApiPromotionDoc) => {
    const url = SITE_PROMO_URLS.promotionDetail(doc._id);
    Linking.openURL(url).catch(() => {});
  }, []);

  const renderFeedItem = (item: FeedItem) => {
    if (item.kind === 'promotion') {
      return (
        <View key={item.key} style={styles.feedBlock}>
          <View style={styles.promoBadgeRow}>
            <Text style={styles.promoBadge}>{t.promoLabel.toUpperCase()}</Text>
          </View>
          <PromotionCard
            doc={item.doc}
            language={language}
            compact
            fillColumn
            masonryImageHeight={promoImageHeightForKey(item.key)}
            onPress={() => openPromotionUrl(item.doc)}
          />
        </View>
      );
    }

    const inf = item.inf;
    const id = inf._id ?? inf.id ?? '';
    const isVoted = votedIds.has(id);
    const voteCount =
      typeof (inf as { wantPromotionCount?: number }).wantPromotionCount === 'number'
        ? (inf as { wantPromotionCount: number }).wantPromotionCount
        : typeof (inf as { voteCount?: number }).voteCount === 'number'
          ? (inf as { voteCount: number }).voteCount
          : undefined;

    return (
      <View key={item.key} style={styles.feedBlock}>
        <View
          style={[
            styles.infCardWrap,
            isVoted && { borderWidth: 2, borderColor: GREEN },
          ]}
        >
          <InfluencerCard
            influencer={inf}
            variant="masonry"
            masonryAspectRatio={aspectRatioForFeedKey(item.key)}
            language={language}
            isVoted={isVoted}
            voteCount={voteCount}
          />
        </View>
        <Pressable
          onPress={() => toggleVote(inf)}
          style={({ pressed }) => [
            styles.voteBtn,
            isVoted ? styles.voteBtnOn : styles.voteBtnOff,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.voteBtnText, isVoted && styles.voteBtnTextOn]}>
            {isVoted ? t.voted : t.vote}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingHorizontal: horizontalPad,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 28),
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={GREEN}
          colors={[GREEN]}
        />
      }
    >
      <View style={styles.section}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>{t.feedKicker}</Text>
          <Text style={styles.heroTitle}>{t.title}</Text>
          <Text style={styles.heroSubtitle}>{t.subtitle}</Text>
          <Text style={styles.heroHint}>{t.feedHint}</Text>
          <Pressable
            onPress={() => navigation.navigate('InfluencerSearch')}
            style={({ pressed }) => [
              styles.registerCta,
              pressed && { opacity: 0.92 },
            ]}
          >
            <Text style={styles.registerCtaText}>{t.registerInfluencer}</Text>
            <Text style={styles.registerCtaHint}>{t.registerInfluencerHint}</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => loadData()}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.retryBtnText}>{t.retry}</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={GREEN} />
            <Text style={styles.loadingText}>{t.loading}</Text>
          </View>
        ) : influencers.length === 0 ? (
          <Text style={styles.emptyText}>{t.empty}</Text>
        ) : (
          <View style={styles.masonryRow}>
            <View style={styles.column}>{left.map(renderFeedItem)}</View>
            <View style={{ width: columnGap }} />
            <View style={styles.column}>{right.map(renderFeedItem)}</View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    paddingVertical: 12,
  },
  hero: {
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heroKicker: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 8,
    lineHeight: 20,
  },
  heroHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
  },
  registerCta: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  registerCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  registerCtaHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    maxWidth: 280,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnText: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 32,
  },
  masonryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  feedBlock: {
    width: '100%',
    marginBottom: 12,
  },
  promoBadgeRow: {
    marginBottom: 6,
  },
  promoBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a73e8',
    letterSpacing: 0.6,
  },
  infCardWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  voteBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  voteBtnOn: {
    backgroundColor: GREEN,
  },
  voteBtnOff: {
    backgroundColor: '#e5e7eb',
  },
  voteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  voteBtnTextOn: {
    color: '#fff',
  },
});
