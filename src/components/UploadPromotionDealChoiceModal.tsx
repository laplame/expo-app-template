import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Box, Text, VStack, Button, ButtonText } from '@gluestack-ui/themed';

export type PromotionUploadDealMode = 'sin_deal' | 'con_deal';

type Props = {
  visible: boolean;
  language: 'es' | 'en';
  brand: string;
  onSelect: (mode: PromotionUploadDealMode) => void;
};

export default function UploadPromotionDealChoiceModal({
  visible,
  language,
  brand,
  onSelect,
}: Props) {
  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: '¿Qué tipo de promoción subes?',
            subtitle:
              'Las promociones sin deal sirven para verificar ofertas reales en la app (foto o video de compra). Las promociones con deal se crean en la web.',
            sinDeal: 'Sin deal (verificación)',
            sinDealHint: 'Sube aquí con foto o video para validar la promoción.',
            conDeal: 'Con deal',
            conDealHint: 'Cupón, comisión y flujo completo en DameCodigo.com.',
          }
        : {
            title: 'What kind of promotion are you uploading?',
            subtitle:
              'No-deal promotions verify real offers in the app (purchase photo or video). Deal promotions are created on the web.',
            sinDeal: 'No deal (verification)',
            sinDealHint: 'Upload here with photo or video to validate the offer.',
            conDeal: 'With deal',
            conDealHint: 'Coupon, commission and full flow on DameCodigo.com.',
          },
    [language]
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={() => {}}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text fontSize="$lg" fontWeight="$bold" color={brand} mb="$2">
            {strings.title}
          </Text>
          <Text fontSize="$sm" color="$textLight700" lineHeight="$md" mb="$4">
            {strings.subtitle}
          </Text>

          <VStack space="md">
            <Pressable
              onPress={() => onSelect('sin_deal')}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <Text fontSize="$md" fontWeight="$bold" color="#111">
                {strings.sinDeal}
              </Text>
              <Text fontSize="$xs" color="$textLight600" mt="$1" lineHeight="$sm">
                {strings.sinDealHint}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onSelect('con_deal')}
              style={({ pressed }) => [
                styles.option,
                styles.optionDeal,
                pressed && styles.optionPressed,
              ]}
            >
              <Text fontSize="$md" fontWeight="$bold" color={brand}>
                {strings.conDeal}
              </Text>
              <Text fontSize="$xs" color="$textLight600" mt="$1" lineHeight="$sm">
                {strings.conDealHint}
              </Text>
            </Pressable>
          </VStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  option: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fafafa',
  },
  optionDeal: {
    borderColor: '#d4a574',
    backgroundColor: '#fffbf7',
  },
  optionPressed: {
    opacity: 0.88,
  },
});
