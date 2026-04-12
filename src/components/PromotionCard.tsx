import React, { useMemo } from 'react';
import { Box, Text, VStack, HStack, Pressable } from '@gluestack-ui/themed';
import { Image } from 'react-native';
import {
  ApiPromotionDoc,
  promotionImageUrl,
  formatPromotionDate,
  isGpsCouponRequired,
  SITE_PROMO_URLS,
} from '../services/promotionsApi';
import CardSocialActions from './CardSocialActions';
import { getCardSocialStrings } from '../i18n/uiStrings';

const CATEGORY_EMOJI: Record<string, string> = {
  electronics: '📱',
  food: '🍽️',
  beverages: '🥤',
  fashion: '👕',
  home: '🏠',
  sports: '⚽',
  other: '🏷️',
};

function formatPrice(currency: string | undefined, amount: number, language: string): string {
  const symbol = currency === 'MXN' ? (language === 'es' ? 'MX$' : '$') : '$';
  return `${symbol}${amount.toLocaleString()}`;
}

function formatLocation(doc: ApiPromotionDoc): string {
  const loc = doc.storeLocation;
  if (!loc) return doc.storeName || '';
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  if (doc.storeName && parts.length) return `${doc.storeName} · ${parts.join(', ')}`;
  if (doc.storeName) return doc.storeName;
  return parts.join(', ') || '';
}

interface PromotionCardProps {
  doc: ApiPromotionDoc;
  language: 'en' | 'es';
  onPress?: () => void;
  compact?: boolean;
  /** Ancho 100% del contenedor (columnas masonry / feed). */
  fillColumn?: boolean;
  /** Altura de la imagen en modo masonry (variar para look Pinterest). */
  masonryImageHeight?: number;
  /** Barra social; si no se indica, solo se muestra cuando `fillColumn` (feed masonry). */
  showSocialActions?: boolean;
}

export default function PromotionCard({
  doc,
  language,
  onPress,
  compact,
  fillColumn,
  masonryImageHeight,
  showSocialActions: showSocialActionsProp,
}: PromotionCardProps) {
  const showSocialBar = showSocialActionsProp !== undefined ? showSocialActionsProp : Boolean(fillColumn);
  const title = doc.title || doc.productName || '';
  const imgUrl = promotionImageUrl(doc);
  const emoji = CATEGORY_EMOJI[doc.category ?? ''] ?? '🏷️';
  const location = formatLocation(doc);
  const validFrom = formatPromotionDate(doc.validFrom);
  const validUntil = formatPromotionDate(doc.validUntil);
  const validRange = [validFrom, validUntil].filter(Boolean).join(' – ');

  const cardContent = (
    <Box
      bg="$white"
      borderRadius="$xl"
      overflow="hidden"
      borderWidth={1}
      borderColor="$borderLight200"
      shadowColor="$black"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      elevation={2}
    >
      {/* Badge descuento */}
      {doc.discountPercentage != null && doc.discountPercentage > 0 && (
        <Box position="absolute" top={8} right={8} zIndex={1} bg="#00704A" borderRadius="$md" px="$2" py="$1">
          <Text fontSize="$xs" color="$white" fontWeight="$bold">
            {doc.discountPercentage}% {language === 'es' ? 'de descuento' : 'off'}
          </Text>
        </Box>
      )}

      {/* Badge promoción con link (redirección a tienda / SocioFest, etc.) */}
      {doc.redirectInsteadOfQr && (
        <Box position="absolute" top={8} left={8} zIndex={1} bg="#1a73e8" borderRadius="$md" px="$2" py="$1">
          <Text fontSize="$xs" color="$white" fontWeight="$bold">
            🔗 {language === 'es' ? 'Ir a comprar' : 'Go to buy'}
          </Text>
        </Box>
      )}
      {isGpsCouponRequired(doc) && (
        <Box
          position="absolute"
          top={doc.redirectInsteadOfQr ? 40 : 8}
          left={8}
          zIndex={1}
          bg="#6B21A8"
          borderRadius="$md"
          px="$2"
          py="$1"
        >
          <Text fontSize="$xs" color="$white" fontWeight="$bold">
            📍 GPS
          </Text>
        </Box>
      )}

      {/* Imagen desde API */}
      <Box
        width="100%"
        height={
          fillColumn ? masonryImageHeight ?? 128 : compact ? 100 : 140
        }
        bg="$backgroundLight100"
      >
        {imgUrl ? (
          <Image
            source={{ uri: imgUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize="$4xl">{emoji}</Text>
          </Box>
        )}
      </Box>

      {showSocialBar ? (
        <CardSocialActions
          language={language}
          shareMessage={title || cardSocial.brandShort}
          shareUrl={doc._id ? SITE_PROMO_URLS.promotionDetail(doc._id) : undefined}
        />
      ) : null}

      <VStack p="$3" space="xs">
        {/* title / productName desde API */}
        <Text fontSize="$sm" fontWeight="$semibold" color="$textLight900" numberOfLines={2}>
          {title}
        </Text>

        {!compact && doc.description ? (
          <Text fontSize="$xs" color="$textLight600" numberOfLines={2}>
            {doc.description}
          </Text>
        ) : null}

        {/* brand y category desde API */}
        <HStack flexWrap="wrap" alignItems="center" space="xs">
          {doc.brand ? (
            <Text fontSize="$xs" color="#00704A" fontWeight="$medium">
              {doc.brand}
            </Text>
          ) : null}
          {doc.category ? (
            <Text fontSize="$xs" color="$textLight500">
              · {doc.category}
            </Text>
          ) : null}
        </HStack>

        {/* Precios desde API */}
        <HStack space="xs" alignItems="center" flexWrap="wrap">
          <Text fontSize="$xs" color="$textLight500" textDecorationLine="line-through">
            {formatPrice(doc.currency, doc.originalPrice, language)}
          </Text>
          <Text fontSize="$md" fontWeight="$bold" color="#00704A">
            {formatPrice(doc.currency, doc.currentPrice, language)}
          </Text>
        </HStack>

        {/* storeName / storeLocation desde API */}
        {location ? (
          <Text fontSize="$xs" color="$textLight500" numberOfLines={1}>
            📍 {location}
          </Text>
        ) : null}

        {/* validFrom / validUntil desde API */}
        {validRange ? (
          <Text fontSize="$xs" color="$textLight400">
            🗓 {validRange}
          </Text>
        ) : null}
      </VStack>
    </Box>
  );

  const outerWidth = fillColumn ? ('100%' as const) : compact ? 160 : 280;

  if (onPress) {
    return (
      <Pressable onPress={onPress} width={outerWidth} alignSelf={fillColumn ? 'stretch' : undefined}>
        {cardContent}
      </Pressable>
    );
  }

  return (
    <Box width={outerWidth} alignSelf={fillColumn ? 'stretch' : undefined}>
      {cardContent}
    </Box>
  );
}
