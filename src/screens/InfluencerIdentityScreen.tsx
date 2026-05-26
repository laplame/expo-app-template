/**
 * Panel del influencer: promociones, deals y redenciones (API + enlace al portal web).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  RefreshControl,
  Linking,
  Image,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, Text, VStack, HStack, Button, ButtonText } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import {
  getInfluencerMe,
  resolveInfluencerImageUrl,
  type InfluencerDoc,
} from '../services/influencersApi';
import {
  verifyInfluencerSession,
  getInfluencerAppCampaigns,
  type InfluencerAppCampaign,
} from '../services/influencerAppApi';
import {
  getAuthAccessToken,
  getWalletAddresses,
  setInfluencerSessionCache,
} from '../services/storage';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import {
  getInfluencerOwnerPortalUrl,
  getInfluencerSetupUrl,
  getInfluencerProfileUrl,
  openInfluencerProfile,
} from '../utils/influencerProfileUrl';

const POLL_MS = 30_000;

type DealRow = {
  key: string;
  title: string;
  subtitle: string;
  status?: string;
  metric?: string;
};

function buildDealRows(
  profile: InfluencerDoc | null,
  campaigns: InfluencerAppCampaign[],
  language: 'es' | 'en'
): DealRow[] {
  const rows: DealRow[] = [];
  const seen = new Set<string>();

  for (const c of campaigns) {
    const id = String(c.id ?? c._id ?? c.promotionId ?? c.title ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push({
      key: `camp-${id}`,
      title: String(c.title ?? 'Campaña'),
      subtitle: language === 'es' ? 'Campaña activa' : 'Active campaign',
      status: String(c.status ?? 'active'),
      metric:
        c.discountPercentage != null ? `${c.discountPercentage}%` : c.shortCode ? `#${c.shortCode}` : undefined,
    });
  }

  const promos = profile?.recentPromotions ?? [];
  for (const p of promos) {
    const id = String(p.id ?? p._id ?? p.title ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const parts: string[] = [];
    if (p.brand) parts.push(p.brand);
    if (p.date) parts.push(p.date);
    if (p.couponUsage != null) parts.push(`${p.couponUsage} cupones`);
    rows.push({
      key: `promo-${id}`,
      title: String(p.title ?? 'Promoción'),
      subtitle: parts.join(' · ') || '—',
      status: p.status,
      metric: p.earnings != null ? `$${p.earnings}` : undefined,
    });
  }

  return rows;
}

export interface InfluencerIdentityScreenProps {
  /** Dentro de Monetización: sin cabecera duplicada. */
  embedded?: boolean;
  onGoRegister?: () => void;
}

export default function InfluencerIdentityScreen({
  embedded = false,
  onGoRegister,
}: InfluencerIdentityScreenProps = {}) {
  const { language } = useSettings();
  const { brand } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [notLinked, setNotLinked] = useState(false);
  const [profile, setProfile] = useState<InfluencerDoc | null>(null);
  const [campaigns, setCampaigns] = useState<InfluencerAppCampaign[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: 'Mi panel',
            subtitle:
              'Promociones, deals y redenciones en DameCodigo.com.',
            openPortal: 'Abrir panel en DameCodigo.com',
            openPublic: 'Ver perfil público',
            refresh: 'Actualizar ahora',
            registerWeb: 'Vincular cuenta en la web',
            goRegisterApp: 'Registrar creador (pestaña)',
            liveRedemptions: 'Redenciones',
            deals: 'Promociones y deals',
            activePromos: 'Activas',
            redeemed: 'Canjeados',
            sales: 'Ventas (cupones)',
            noDeals: 'Aún no hay promociones ni deals en tu panel.',
            signInHint:
              'Inicia sesión en DameCodigo.com con tu cuenta de influencer para ver promociones y redenciones en tiempo real.',
            notLinkedHint:
              'Tu usuario no está vinculado a un perfil de influencer. Completa el alta en la web.',
            updated: 'Actualizado',
            polling: 'Se actualiza cada 30 s',
            couponActive: 'Cupones activos',
          }
        : {
            title: 'My panel',
            subtitle: 'Promotions, deals, and redemptions on DameCodigo.com.',
            openPortal: 'Open panel on DameCodigo.com',
            openPublic: 'View public profile',
            refresh: 'Refresh now',
            registerWeb: 'Link account on web',
            goRegisterApp: 'Register creator (tab)',
            liveRedemptions: 'Redemptions',
            deals: 'Promotions & deals',
            activePromos: 'Active',
            redeemed: 'Redeemed',
            sales: 'Sales (coupons)',
            noDeals: 'No promotions or deals in your panel yet.',
            signInHint:
              'Sign in on DameCodigo.com with your influencer account to see promotions and live redemptions.',
            notLinkedHint:
              'Your user is not linked to an influencer profile. Complete setup on the web.',
            updated: 'Updated',
            polling: 'Refreshes every 30s',
            couponActive: 'Active coupons',
          },
    [language]
  );

  const loadSession = useCallback(
    async (isRefresh?: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setNeedsAuth(false);
      setNotLinked(false);

      const token = await getAuthAccessToken();
      if (!token) {
        setProfile(null);
        setCampaigns([]);
        setNeedsAuth(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const wallets = await getWalletAddresses();
      const defaultWallet = wallets.find((w) => w.isDefault) ?? wallets[0];

      const [meRes, verifyRes, campRes] = await Promise.all([
        getInfluencerMe(token),
        verifyInfluencerSession(
          {
            deviceId,
            walletAddress: defaultWallet?.address,
            preferredNetwork: defaultWallet?.chain === 'polygon' ? 'polygon' : 'ethereum',
          },
          token
        ),
        getInfluencerAppCampaigns(token),
      ]);

      if (verifyRes.code === 'INFLUENCER_NOT_LINKED' || meRes.code === 'INFLUENCER_NOT_LINKED') {
        setNotLinked(true);
        setProfile(null);
        setCampaigns([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const doc = meRes.ok ? meRes.data : verifyRes.influencer ?? null;
      if (!doc && !meRes.ok && !verifyRes.ok) {
        setError(meRes.error ?? verifyRes.error ?? 'Error');
        setProfile(null);
        setCampaigns([]);
      } else {
        const merged = doc ? { ...doc, ...(verifyRes.influencer ?? {}) } : null;
        setProfile(merged);
        const campList =
          (campRes.ok && campRes.campaigns?.length ? campRes.campaigns : verifyRes.campaigns) ?? [];
        setCampaigns(campList);
        if (merged) {
          const id = merged._id ?? merged.id;
          await setInfluencerSessionCache({
            savedAt: Date.now(),
            influencerId: id,
            publicSlug: merged.publicSlug ?? merged.username,
            displayName: merged.displayName ?? merged.name,
          });
        }
      }

      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadSession();
    }, [loadSession])
  );

  useEffect(() => {
    const id = setInterval(() => {
      void loadSession(true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [loadSession]);

  const dealRows = useMemo(
    () => buildDealRows(profile, campaigns, language),
    [profile, campaigns, language]
  );

  const stats = useMemo(() => {
    const cs = profile?.couponStats;
    return {
      active: profile?.activePromotions ?? cs?.activeCoupons ?? 0,
      redeemed: profile?.redeemedCoupons ?? 0,
      sales: cs?.totalSales ?? 0,
      activeCoupons: cs?.activeCoupons ?? 0,
    };
  }, [profile]);

  const openPortal = () => {
    Linking.openURL(getInfluencerOwnerPortalUrl()).catch(() => {});
  };

  const avatarUrl = resolveInfluencerImageUrl(profile?.avatar ?? profile?.profileImageUrl);
  const displayName = profile?.displayName ?? profile?.name ?? '—';
  const publicUrl = profile ? getInfluencerProfileUrl(profile) : null;

  return (
    <Box flex={1} bg="#f4f6f8">
      {!embedded ? <StatusBar style="dark" /> : null}
      <ScrollView
        contentContainerStyle={{
          paddingTop: embedded ? 12 : Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 28),
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadSession(true)}
            tintColor={brand}
            colors={[brand]}
          />
        }
      >
        {!embedded ? (
          <Box bg={brand} borderRadius="$2xl" p="$4" mb="$4">
            <Text fontSize="$xl" fontWeight="$bold" color="$white">
              {strings.title}
            </Text>
            <Text fontSize="$sm" color="$white" opacity={0.92} mt="$2" lineHeight="$md">
              {strings.subtitle}
            </Text>
            {lastUpdated ? (
              <Text fontSize="$2xs" color="$white" opacity={0.8} mt="$2">
                {strings.updated}:{' '}
                {lastUpdated.toLocaleTimeString(language === 'es' ? 'es' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}{' '}
                · {strings.polling}
              </Text>
            ) : null}
          </Box>
        ) : lastUpdated ? (
          <Text fontSize="$2xs" color="$textLight500" mb="$3">
            {strings.updated}:{' '}
            {lastUpdated.toLocaleTimeString(language === 'es' ? 'es' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}{' '}
            · {strings.polling}
          </Text>
        ) : null}

        <VStack space="sm" mb="$4">
          <Button size="md" bg={brand} onPress={openPortal}>
            <ButtonText>{strings.openPortal}</ButtonText>
          </Button>
          {publicUrl ? (
            <Button
              size="md"
              variant="outline"
              borderColor={brand}
              onPress={() => profile && void openInfluencerProfile(profile, language)}
            >
              <ButtonText color={brand}>{strings.openPublic}</ButtonText>
            </Button>
          ) : null}
        </VStack>

        {loading ? (
          <HStack justifyContent="center" py="$8" space="sm" alignItems="center">
            <ActivityIndicator color={brand} />
          </HStack>
        ) : needsAuth ? (
          <Box bg="$white" borderRadius="$xl" p="$4" borderWidth={1} borderColor="$borderLight200">
            <Text fontSize="$sm" color="$textLight700" lineHeight="$md">
              {strings.signInHint}
            </Text>
            <Button size="md" mt="$4" bg={brand} onPress={openPortal}>
              <ButtonText>{strings.openPortal}</ButtonText>
            </Button>
          </Box>
        ) : notLinked ? (
          <Box bg="$white" borderRadius="$xl" p="$4" borderWidth={1} borderColor="$borderLight200">
            <Text fontSize="$sm" color="$textLight700" lineHeight="$md">
              {strings.notLinkedHint}
            </Text>
            <VStack space="sm" mt="$4">
              <Button
                size="md"
                bg={brand}
                onPress={() => Linking.openURL(getInfluencerSetupUrl()).catch(() => {})}
              >
                <ButtonText>{strings.registerWeb}</ButtonText>
              </Button>
              <Button
                size="md"
                variant="outline"
                borderColor={brand}
                onPress={() =>
                  onGoRegister
                    ? onGoRegister()
                    : navigation.navigate('Monetization', { tab: 'register' })
                }
              >
                <ButtonText color={brand}>{strings.goRegisterApp}</ButtonText>
              </Button>
            </VStack>
          </Box>
        ) : (
          <>
            {error ? (
              <Box bg="#fee2e2" borderRadius="$md" p="$3" mb="$3">
                <Text fontSize="$sm" color="#991b1b">{error}</Text>
              </Box>
            ) : null}

            <Box
              bg="$white"
              borderRadius="$xl"
              p="$4"
              mb="$3"
              borderWidth={1}
              borderColor="$borderLight200"
            >
              <HStack space="md" alignItems="center">
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                  <Box
                    w={56}
                    h={56}
                    borderRadius="$full"
                    bg="$backgroundLight200"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="$2xl">👤</Text>
                  </Box>
                )}
                <VStack flex={1}>
                  <Text fontSize="$lg" fontWeight="$bold" color={brand}>
                    {displayName}
                  </Text>
                  {profile?.publicSlug || profile?.username ? (
                    <Text fontSize="$xs" color="$textLight500">
                      @{profile.publicSlug ?? profile.username}
                    </Text>
                  ) : null}
                </VStack>
              </HStack>
            </Box>

            <HStack space="sm" mb="$4" flexWrap="wrap">
              <StatChip label={strings.activePromos} value={String(stats.active)} />
              <StatChip label={strings.redeemed} value={String(stats.redeemed)} />
              <StatChip label={strings.sales} value={String(stats.sales)} />
              <StatChip label={strings.couponActive} value={String(stats.activeCoupons)} />
            </HStack>

            <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
              {strings.liveRedemptions}
            </Text>
            <Box
              bg="$white"
              borderRadius="$xl"
              p="$4"
              mb="$4"
              borderWidth={1}
              borderColor="$borderLight200"
            >
              <Text fontSize="$2xl" fontWeight="$bold" color={brand}>
                {stats.redeemed}
              </Text>
              <Text fontSize="$xs" color="$textLight500" mt="$1">
                {language === 'es'
                  ? 'Total canjeados (se actualiza al refrescar)'
                  : 'Total redeemed (updates on refresh)'}
              </Text>
            </Box>

            <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
              {strings.deals}
            </Text>
            {dealRows.length === 0 ? (
              <Text fontSize="$sm" color="$textLight500" mb="$4">
                {strings.noDeals}
              </Text>
            ) : (
              <VStack space="sm" mb="$4">
                {dealRows.map((row) => (
                  <DealCard key={row.key} row={row} />
                ))}
              </VStack>
            )}

            <Pressable
              onPress={() => void loadSession(true)}
              style={({ pressed }) => [styles.refreshLink, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.refreshLinkText, { color: brand }]}>{strings.refresh}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Box>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <Box
      flex={1}
      minWidth={72}
      bg="$white"
      borderRadius="$lg"
      p="$3"
      borderWidth={1}
      borderColor="$borderLight200"
    >
      <Text fontSize="$lg" fontWeight="$bold" color={brand}>
        {value}
      </Text>
      <Text fontSize="$2xs" color="$textLight500" numberOfLines={2}>
        {label}
      </Text>
    </Box>
  );
}

function DealCard({ row }: { row: DealRow }) {
  return (
    <Box
      bg="$white"
      borderRadius="$lg"
      p="$3"
      borderWidth={1}
      borderColor="$borderLight200"
    >
      <HStack justifyContent="space-between" alignItems="flex-start">
        <VStack flex={1} pr="$2">
          <Text fontSize="$sm" fontWeight="$bold" color="#111">
            {row.title}
          </Text>
          <Text fontSize="$xs" color="$textLight500" mt="$0.5">
            {row.subtitle}
          </Text>
          {row.status ? (
            <Text fontSize="$2xs" color="#1a73e8" mt="$1" fontWeight="$semibold">
              {row.status}
            </Text>
          ) : null}
        </VStack>
        {row.metric ? (
          <Text fontSize="$sm" fontWeight="$bold" color={brand}>
            {row.metric}
          </Text>
        ) : null}
      </HStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  refreshLink: {
    alignSelf: 'center',
    paddingVertical: 12,
  },
  refreshLinkText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
