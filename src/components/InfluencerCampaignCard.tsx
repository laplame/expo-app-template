import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking } from 'react-native';
import { Box, Text, HStack, Button, ButtonText } from '@gluestack-ui/themed';
import {
  campaignDisplayTitle,
  createInfluencerStoryCard,
  type InfluencerAppCampaign,
  type StoryCardResult,
} from '../services/influencerAppApi';
import { issueDiscountQrByShortCode } from '../services/discountQrApi';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { appendInfluencerQrIssue, type InfluencerQrIssueRecord } from '../services/storage';
import InfluencerStoryPreviewModal from './InfluencerStoryPreviewModal';
import InfluencerCouponQrModal from './InfluencerCouponQrModal';

type Props = {
  campaign: InfluencerAppCampaign;
  accessToken: string;
  walletAddress?: string;
  language: 'es' | 'en';
  brand: string;
};

export default function InfluencerCampaignCard({
  campaign,
  accessToken,
  walletAddress,
  language,
  brand,
}: Props) {
  const [storyLoading, setStoryLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [storyResult, setStoryResult] = useState<StoryCardResult | null>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const strings =
    language === 'es'
      ? {
          story: 'Generar story',
          coupon: 'Cupón QR',
          discount: 'Descuento',
          code: 'Código',
          pending: 'Pendiente',
          paid: 'Pagado',
        }
      : {
          story: 'Generate story',
          coupon: 'Coupon QR',
          discount: 'Discount',
          code: 'Code',
          pending: 'Pending',
          paid: 'Paid',
        };

  const title = campaignDisplayTitle(campaign);
  const shortCode = campaign.shortCode ?? campaign.referralCode?.replace(/^L4D-/i, '');
  const referralCode = campaign.referralCode;
  const discount = campaign.discountPercentage;
  const settlement = campaign.settlement;

  const handleStory = async () => {
    setStoryLoading(true);
    try {
      const res = await createInfluencerStoryCard(
        {
          shortCode: campaign.shortCode ?? undefined,
          promotionId: campaign.promotionId ?? campaign.id ?? campaign._id,
          discountPercentage: campaign.discountPercentage,
        },
        accessToken
      );
      if (!res.ok) {
        Alert.alert(
          language === 'es' ? 'Error' : 'Error',
          res.error ?? (language === 'es' ? 'No se pudo generar' : 'Could not generate')
        );
        return;
      }
      setStoryResult(res);
      setShowStoryModal(true);
    } finally {
      setStoryLoading(false);
    }
  };

  const handleIssueQr = async () => {
    const code = campaign.shortCode ?? shortCode;
    if (!code) {
      Alert.alert(
        language === 'es' ? 'Sin código' : 'No code',
        language === 'es' ? 'Esta campaña no tiene código corto.' : 'This campaign has no short code.'
      );
      return;
    }
    setQrLoading(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await issueDiscountQrByShortCode(code, {
        deviceId,
        walletAddress,
      });
      if (res.redirectToUrl) {
        void Linking.openURL(res.redirectToUrl);
        return;
      }
      if (!res.ok || !res.qrValue) {
        Alert.alert(
          language === 'es' ? 'Error' : 'Error',
          res.message ?? (language === 'es' ? 'No se pudo emitir cupón' : 'Could not issue coupon')
        );
        return;
      }
      setQrValue(res.qrValue);
      setShowQrModal(true);
      await appendInfluencerQrIssue({
        shortCode: code,
        campaignTitle: title,
        qrValue: res.qrValue,
        referralCode: referralCode ?? undefined,
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleHistorySelect = (record: InfluencerQrIssueRecord) => {
    setQrValue(record.qrValue);
  };

  return (
    <>
      <Box bg="$white" borderRadius="$lg" p="$3" borderWidth={1} borderColor="$borderLight200">
        <Text fontSize="$sm" fontWeight="$bold" color="#111">
          {title}
        </Text>

        <HStack mt="$2" space="md" flexWrap="wrap">
          {shortCode ? (
            <Text fontSize="$xs" color={brand} fontWeight="$semibold">
              {strings.code}: #{String(shortCode).replace(/^#/, '')}
            </Text>
          ) : null}
          {discount != null ? (
            <Text fontSize="$xs" color="$textLight600">
              {strings.discount}: {discount}%
            </Text>
          ) : null}
        </HStack>

        {settlement ? (
          <Text fontSize="$2xs" color="$textLight500" mt="$1">
            {strings.pending}: ${(settlement.pendingAmountUsd ?? 0).toFixed(2)} · {strings.paid}: $
            {(settlement.paidAmountUsd ?? 0).toFixed(2)}
          </Text>
        ) : null}

        <HStack space="sm" mt="$3" flexWrap="wrap">
          <Button
            size="sm"
            variant="outline"
            borderColor={brand}
            onPress={() => void handleStory()}
            isDisabled={storyLoading}
          >
            {storyLoading ? (
              <ActivityIndicator color={brand} size="small" />
            ) : (
              <ButtonText color={brand} fontSize="$xs">
                {strings.story}
              </ButtonText>
            )}
          </Button>
          {campaign.canIssueCoupon !== false && (campaign.shortCode ?? shortCode) ? (
            <Button size="sm" bg={brand} onPress={() => void handleIssueQr()} isDisabled={qrLoading}>
              {qrLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ButtonText fontSize="$xs">{strings.coupon}</ButtonText>
              )}
            </Button>
          ) : null}
        </HStack>
      </Box>

      <InfluencerStoryPreviewModal
        visible={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        story={storyResult}
        campaignTitle={title}
        language={language}
        brand={brand}
      />

      <InfluencerCouponQrModal
        visible={showQrModal}
        onClose={() => setShowQrModal(false)}
        qrValue={qrValue}
        shortCode={campaign.shortCode ?? shortCode}
        referralCode={referralCode}
        campaignTitle={title}
        language={language}
        brand={brand}
        onSelectHistory={handleHistorySelect}
      />
    </>
  );
}
