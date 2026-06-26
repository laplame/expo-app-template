import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Box, Text, VStack, HStack, Button, ButtonText } from '@gluestack-ui/themed';
import type { StoryCardResult } from '../services/influencerAppApi';
import { shareRemoteImage } from '../utils/shareRemoteImage';

type Props = {
  visible: boolean;
  onClose: () => void;
  story: StoryCardResult | null;
  campaignTitle?: string;
  language: 'es' | 'en';
  brand: string;
};

export default function InfluencerStoryPreviewModal({
  visible,
  onClose,
  story,
  campaignTitle,
  language,
  brand,
}: Props) {
  const [sharing, setSharing] = useState(false);

  const strings =
    language === 'es'
      ? {
          title: 'Story generada',
          share: 'Compartir imagen',
          copyUrl: 'Copiar enlace',
          copyPrompt: 'Copiar prompt',
          copyCode: 'Copiar código',
          close: 'Cerrar',
          copied: 'Copiado al portapapeles',
          promptHint: 'Sin imagen en servidor. Usa el prompt abajo o comparte el enlace cuando exista.',
          discount: 'Descuento',
          code: 'Código',
          referral: 'Referral',
        }
      : {
          title: 'Generated story',
          share: 'Share image',
          copyUrl: 'Copy link',
          copyPrompt: 'Copy prompt',
          copyCode: 'Copy code',
          close: 'Close',
          copied: 'Copied to clipboard',
          promptHint: 'No server image. Use the prompt below or share the link when available.',
          discount: 'Discount',
          code: 'Code',
          referral: 'Referral',
        };

  const copyText = useCallback(
    async (text: string, label?: string) => {
      if (!text.trim()) return;
      await Clipboard.setStringAsync(text.trim());
      Alert.alert(label ?? strings.copied, strings.copied);
    },
    [strings.copied]
  );

  const handleShare = useCallback(async () => {
    if (!story?.imageUrl) {
      const parts = [
        campaignTitle,
        story?.shortCode ? `#${story.shortCode}` : null,
        story?.discountPercentage != null ? `${story.discountPercentage}%` : null,
        story?.imageUrl,
      ].filter(Boolean);
      try {
        await Share.share({ message: parts.join(' · ') });
      } catch {
        // cancelado
      }
      return;
    }
    setSharing(true);
    try {
      const msg = [
        campaignTitle,
        story.shortCode ? `#${story.shortCode}` : null,
        story.discountPercentage != null ? `${story.discountPercentage}% off` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      const res = await shareRemoteImage(story.imageUrl, { message: msg, title: campaignTitle });
      if (!res.ok && res.error && res.error !== 'Share cancelled') {
        Alert.alert(language === 'es' ? 'Error' : 'Error', res.error);
      }
    } finally {
      setSharing(false);
    }
  }, [campaignTitle, language, story]);

  const handleSharePrompt = useCallback(async () => {
    if (!story?.promptForClient) return;
    try {
      await Share.share({ message: story.promptForClient });
    } catch {
      // cancelado
    }
  }, [story?.promptForClient]);

  if (!story) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
            {strings.title}
          </Text>
          {campaignTitle ? (
            <Text fontSize="$xs" color="$textLight600" mb="$2">
              {campaignTitle}
            </Text>
          ) : null}

          <HStack space="md" mb="$3" flexWrap="wrap">
            {story.shortCode ? (
              <Text fontSize="$2xs" color={brand} fontWeight="$semibold">
                {strings.code}: #{story.shortCode}
              </Text>
            ) : null}
            {story.discountPercentage != null ? (
              <Text fontSize="$2xs" color="$textLight600">
                {strings.discount}: {story.discountPercentage}%
              </Text>
            ) : null}
            {story.referralCode ? (
              <Text fontSize="$2xs" color="$textLight500">
                {strings.referral}: {story.referralCode}
              </Text>
            ) : null}
          </HStack>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {story.imageUrl ? (
              <Image source={{ uri: story.imageUrl }} style={styles.storyImage} resizeMode="contain" />
            ) : story.promptForClient ? (
              <Box bg="$backgroundLight100" borderRadius="$lg" p="$3">
                <Text fontSize="$sm" color="#333" lineHeight="$md">
                  {story.promptForClient}
                </Text>
              </Box>
            ) : (
              <Text fontSize="$sm" color="$textLight500">
                {strings.promptHint}
              </Text>
            )}
          </ScrollView>

          <VStack space="sm" mt="$3">
            <Button size="md" bg={brand} onPress={() => void handleShare()} isDisabled={sharing}>
              {sharing ? (
                <HStack space="sm" alignItems="center">
                  <ActivityIndicator color="#fff" size="small" />
                  <ButtonText>{strings.share}</ButtonText>
                </HStack>
              ) : (
                <ButtonText>{strings.share}</ButtonText>
              )}
            </Button>

            {story.imageUrl ? (
              <Button
                size="md"
                variant="outline"
                borderColor={brand}
                onPress={() => void copyText(story.imageUrl!, strings.copyUrl)}
              >
                <ButtonText color={brand}>{strings.copyUrl}</ButtonText>
              </Button>
            ) : null}

            {story.promptForClient ? (
              <HStack space="sm">
                <Button
                  flex={1}
                  size="md"
                  variant="outline"
                  borderColor={brand}
                  onPress={() => void copyText(story.promptForClient!, strings.copyPrompt)}
                >
                  <ButtonText color={brand}>{strings.copyPrompt}</ButtonText>
                </Button>
                {Platform.OS !== 'web' ? (
                  <Button flex={1} size="md" variant="outline" borderColor={brand} onPress={() => void handleSharePrompt()}>
                    <ButtonText color={brand}>{strings.share}</ButtonText>
                  </Button>
                ) : null}
              </HStack>
            ) : null}

            {story.shortCode ? (
              <Button
                size="md"
                variant="outline"
                borderColor={brand}
                onPress={() => void copyText(story.shortCode!, strings.copyCode)}
              >
                <ButtonText color={brand}>{strings.copyCode}</ButtonText>
              </Button>
            ) : null}

            <Button size="md" variant="link" onPress={onClose}>
              <ButtonText color={brand}>{strings.close}</ButtonText>
            </Button>
          </VStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  scroll: {
    maxHeight: 360,
  },
  storyImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
});
