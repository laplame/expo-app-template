/**
 * Tarjeta compacta de influencer (para listados) o expandida (detalle).
 * Ref: assets/docs/buscarInfluencers.md
 */
import React, { useMemo } from 'react';
import { Box, Text, VStack, HStack, Pressable } from '@gluestack-ui/themed';
import { Image, Linking, Alert, Pressable as RNPressable } from 'react-native';
import type { InfluencerDoc, InfluencerFollowers } from '../services/influencersApi';
import { resolveInfluencerImageUrl } from '../services/influencersApi';
import CardSocialActions from './CardSocialActions';
import { getCardSocialStrings } from '../i18n/uiStrings';

interface InfluencerCardProps {
  influencer: InfluencerDoc;
  onPress?: () => void;
  compact?: boolean;
  /** Feed tipo Pinterest: imagen arriba, texto apilado. */
  variant?: 'default' | 'masonry';
  /** En masonry: ancho/alto de la foto (variar por tarjeta para look orgánico). Por defecto ~0,82. */
  masonryAspectRatio?: number;
  language?: 'en' | 'es';
  /** Votos totales del servidor (opcional); si no hay backend, se usa isVoted local */
  voteCount?: number;
  /** Si el usuario actual votó por este influencer */
  isVoted?: boolean;
}

/** Construye la URL del perfil según la plataforma */
function buildPlatformUrl(platformKey: string, handle: string): string | null {
  const user = (handle ?? '').trim().replace(/^@/, '');
  if (!user) return null;
  const k = platformKey.toLowerCase();
  if (k.includes('instagram') || k === 'ig') return `https://www.instagram.com/${user}`;
  if (k.includes('tiktok')) return `https://www.tiktok.com/@${user}`;
  if (k.includes('youtube') || k === 'yt') return `https://www.youtube.com/@${user}`;
  if (k.includes('twitter') || k === 'x') return `https://x.com/${user}`;
  if (k.includes('facebook')) return `https://www.facebook.com/${user}`;
  if (k.includes('linkedin')) return `https://www.linkedin.com/in/${user}`;
  if (k.includes('twitch')) return `https://www.twitch.tv/${user}`;
  return null;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/** Extrae red principal: la de más seguidores, o la primera con username si no hay counts */
function getMainSocial(
  followers?: InfluencerFollowers,
  socialMedia?: InfluencerDoc['socialMedia']
): { platform: string; username: string; count: number } | null {
  const f = (followers ?? {}) as Record<string, number>;
  const platforms = [
    { k: 'tiktok', label: 'TikTok' },
    { k: 'instagram', label: 'Instagram' },
    { k: 'youtube', label: 'YouTube' },
    { k: 'twitter', label: 'Twitter' },
  ];
  let best: { platform: string; username: string; count: number } | null = null;
  for (const p of platforms) {
    const count = f[p.k] ?? 0;
    let username = '';
    if (socialMedia && !Array.isArray(socialMedia) && typeof socialMedia === 'object') {
      username = ((socialMedia as Record<string, string>)[p.k] ?? '').trim();
    } else if (Array.isArray(socialMedia)) {
      const s = socialMedia.find((x) => (x.platform ?? '').toLowerCase().includes(p.k));
      username = ((s?.username ?? s?.url) ?? '').trim();
    }
    if (count > 0 || username) {
      if (!best || count > best.count) {
        best = { platform: p.label, username, count };
      }
    }
  }
  return best;
}

/** Convierte socialMedia (array u objeto) a lista legible */
function getSocialList(influencer: InfluencerDoc): { platform: string; handle: string }[] {
  const sm = influencer.socialMedia;
  if (!sm) return [];
  if (Array.isArray(sm)) {
    return sm
      .filter((s) => (s.username ?? s.url ?? '').trim())
      .map((s) => ({ platform: s.platform ?? '—', handle: s.username ?? s.url ?? '' }));
  }
  const obj = sm as Record<string, string>;
  const labels: Record<string, string> = { instagram: 'IG', tiktok: 'TikTok', youtube: 'YT', twitter: 'X' };
  return Object.entries(obj)
    .filter(([, v]) => (v ?? '').trim())
    .map(([k, v]) => ({ platform: labels[k] ?? k, handle: v }));
}

/** Comprueba si es una URL completa (http/https) */
function isFullUrl(str: string): boolean {
  const t = (str ?? '').trim().toLowerCase();
  return t.startsWith('http://') || t.startsWith('https://');
}

/** Obtiene la primera URL válida de canal para abrir */
function getFirstChannelUrl(influencer: InfluencerDoc): { url: string; platform: string } | null {
  const socialList = getSocialList(influencer);
  for (const s of socialList) {
    const handle = (s.handle ?? '').trim();
    if (!handle) continue;
    const url = isFullUrl(handle)
      ? handle
      : buildPlatformUrl(s.platform, handle);
    if (url) return { url, platform: s.platform };
  }
  return null;
}

export default function InfluencerCard({
  influencer,
  onPress,
  compact = true,
  variant = 'default',
  masonryAspectRatio = 0.82,
  language = 'es',
  voteCount,
  isVoted,
}: InfluencerCardProps) {
  const displayName = influencer.displayName ?? influencer.name ?? '';
  const bio = (influencer.bio ?? '').slice(0, compact ? 80 : 200);
  const masonryBio = (influencer.bio ?? '').slice(0, 100);
  const categories = influencer.categories ?? [];
  const totalFollowers = influencer.totalFollowers ?? 0;
  const mainSocial = getMainSocial(influencer.followers, influencer.socialMedia);
  const socialList = getSocialList(influencer);
  const channelUrl = getFirstChannelUrl(influencer);
  const imageUrl = resolveInfluencerImageUrl(
    influencer.avatar ?? influencer.profileImageUrl
  );
  const cardSocial = useMemo(() => getCardSocialStrings(language), [language]);

  const handleViewChannel = () => {
    if (!channelUrl) return;
    Linking.openURL(channelUrl.url).catch((err) => {
      Alert.alert(
        language === 'es' ? 'No se puede abrir' : 'Cannot open',
        (err as Error)?.message ?? (language === 'es' ? 'No es posible abrir el enlace.' : 'Link cannot be opened.'),
        [{ text: 'OK' }]
      );
    });
  };

  const displayVoteCount = voteCount ?? (isVoted ? 1 : 0);
  const statsLabel =
    language === 'es'
      ? displayVoteCount === 1
        ? '1 persona quiere su promoción'
        : `${displayVoteCount} personas quieren su promoción`
      : displayVoteCount === 1
        ? '1 person wants their promotion'
        : `${displayVoteCount} people want their promotion`;

  if (variant === 'masonry') {
    const masonryContent = (
      <Box
        bg="$white"
        borderRadius="$xl"
        overflow="hidden"
        borderWidth={1}
        borderColor="$borderLight200"
        width="100%"
        shadowColor="$black"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.08}
        shadowRadius={4}
        elevation={2}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', aspectRatio: masonryAspectRatio }}
            resizeMode="cover"
          />
        ) : (
          <Box
            w="100%"
            aspectRatio={masonryAspectRatio}
            bg="$backgroundLight200"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="$6xl">👤</Text>
          </Box>
        )}
        <CardSocialActions
          language={language}
          shareMessage={displayName ? `${displayName} · ${cardSocial.brandShort}` : cardSocial.brandShort}
          shareUrl={channelUrl?.url}
        />
        <VStack p="$3" space="xs">
          <Text fontSize="$md" fontWeight="$bold" color="#00704A" numberOfLines={2}>
            {displayName}
          </Text>
          {(totalFollowers > 0 || mainSocial) && (
            <HStack space="xs" alignItems="center" flexWrap="wrap">
              {totalFollowers > 0 && (
                <Text fontSize="$2xs" color="$textLight500" fontWeight="$medium">
                  👥 {formatFollowers(totalFollowers)}
                </Text>
              )}
              {mainSocial?.username ? (
                <Text fontSize="$2xs" color="$textLight500" numberOfLines={1}>
                  @{mainSocial.username.replace(/^@/, '')}
                </Text>
              ) : null}
            </HStack>
          )}
          {influencer.location ? (
            <Text fontSize="$2xs" color="$textLight500" numberOfLines={1}>
              📍 {influencer.location}
            </Text>
          ) : null}
          {masonryBio ? (
            <Text fontSize="$xs" color="$textLight600" numberOfLines={3}>
              {masonryBio}
            </Text>
          ) : null}
          {categories.length > 0 && (
            <HStack flexWrap="wrap" mt="$1" space="xs">
              {categories.slice(0, 3).map((c) => (
                <Box key={c} bg="$backgroundLight100" borderRadius="$full" px="$2" py="$0.5">
                  <Text fontSize="$2xs" color="$textLight600">
                    {c}
                  </Text>
                </Box>
              ))}
            </HStack>
          )}
          {channelUrl && (
            <RNPressable
              onPress={handleViewChannel}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 0,
                opacity: pressed ? 0.85 : 1,
              })}
              hitSlop={8}
            >
              <Text fontSize="$xs" color="#00704A" fontWeight="$semibold">
                {language === 'es' ? `Ver canal · ${channelUrl.platform}` : `View channel · ${channelUrl.platform}`}
              </Text>
            </RNPressable>
          )}
          {(displayVoteCount > 0 || (voteCount === 0 && voteCount !== undefined)) && (
            <Text fontSize="$2xs" color="$textLight500" numberOfLines={2}>
              📊 {statsLabel}
            </Text>
          )}
        </VStack>
      </Box>
    );
    if (onPress) {
      return (
        <Pressable onPress={onPress} width="100%">
          {masonryContent}
        </Pressable>
      );
    }
    return masonryContent;
  }

  const content = (
    <Box
      bg="$white"
      borderRadius="$lg"
      p="$3"
      borderWidth={1}
      borderColor="$borderLight200"
      overflow="hidden"
    >
      <HStack space="sm" alignItems="flex-start">
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: compact ? 48 : 80, height: compact ? 48 : 80, borderRadius: 999 }}
            resizeMode="cover"
          />
        ) : (
          <Box
            w={compact ? 48 : 80}
            h={compact ? 48 : 80}
            borderRadius="$full"
            bg="$backgroundLight200"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={compact ? '$xl' : '$2xl'}>👤</Text>
          </Box>
        )}
        <VStack flex={1} space="xs">
          <Text fontSize="$md" fontWeight="$bold" color="#00704A">
            {displayName}
          </Text>
          {(totalFollowers > 0 || mainSocial) && (
            <HStack space="xs" alignItems="center" flexWrap="wrap">
              {totalFollowers > 0 && (
                <Text fontSize="$xs" color="$textLight500" fontWeight="$medium">
                  👥 {formatFollowers(totalFollowers)} {language === 'es' ? 'seguidores' : 'followers'}
                </Text>
              )}
              {mainSocial && (mainSocial.username || mainSocial.count > 0) && (
                <Text fontSize="$xs" color="$textLight500">
                  · {mainSocial.platform}{mainSocial.username ? `: @${mainSocial.username.replace(/^@/, '')}` : ''}
                  {mainSocial.count > 0 ? ` (${formatFollowers(mainSocial.count)})` : ''}
                </Text>
              )}
            </HStack>
          )}
          {influencer.location && (
            <Text fontSize="$xs" color="$textLight500">
              📍 {influencer.location}
            </Text>
          )}
          {bio ? (
            <Text fontSize="$xs" color="$textLight600" numberOfLines={compact ? 2 : 4}>
              {bio}
            </Text>
          ) : null}
          {categories.length > 0 && (
            <HStack flexWrap="wrap" mt="$1" space="xs">
              {categories.slice(0, compact ? 3 : 6).map((c) => (
                <Box
                  key={c}
                  bg="$backgroundLight100"
                  borderRadius="$full"
                  px="$2"
                  py="$0.5"
                >
                  <Text fontSize="$2xs" color="$textLight600">
                    {c}
                  </Text>
                </Box>
              ))}
            </HStack>
          )}
          {socialList.length > 0 && (
            <HStack space="xs" mt="$1" flexWrap="wrap">
              {socialList.slice(0, compact ? 2 : 4).map((s, i) => (
                <Text key={i} fontSize="$2xs" color="$textLight500">
                  {s.platform}: @{s.handle.replace(/^@/, '')}
                </Text>
              ))}
            </HStack>
          )}
          <HStack space="sm" mt="$2" flexWrap="wrap" alignItems="center">
            {channelUrl && (
              <RNPressable
                onPress={handleViewChannel}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#00704A',
                  backgroundColor: pressed ? 'rgba(0,112,74,0.1)' : 'transparent',
                })}
                hitSlop={8}
              >
                <Text fontSize="$sm" color="#00704A" fontWeight="$medium">
                  {language === 'es' ? `Ver canal (${channelUrl.platform})` : `View channel (${channelUrl.platform})`}
                </Text>
              </RNPressable>
            )}
            {(displayVoteCount > 0 || (voteCount === 0 && voteCount !== undefined)) && (
              <Text fontSize="$xs" color="$textLight500">
                📊 {statsLabel}
              </Text>
            )}
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} _pressed={{ opacity: 0.9 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}
