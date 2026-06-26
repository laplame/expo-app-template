import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Box, Text, VStack, HStack, Button, ButtonText } from '@gluestack-ui/themed';
import QRCode from 'react-native-qrcode-svg';
import {
  getInfluencerQrIssueHistory,
  type InfluencerQrIssueRecord,
} from '../services/storage';

type Props = {
  visible: boolean;
  onClose: () => void;
  qrValue: string | null;
  shortCode?: string;
  referralCode?: string;
  campaignTitle?: string;
  language: 'es' | 'en';
  brand: string;
  onSelectHistory?: (record: InfluencerQrIssueRecord) => void;
};

export default function InfluencerCouponQrModal({
  visible,
  onClose,
  qrValue,
  shortCode,
  referralCode,
  campaignTitle,
  language,
  brand,
  onSelectHistory,
}: Props) {
  const [history, setHistory] = useState<InfluencerQrIssueRecord[]>([]);

  const strings =
    language === 'es'
      ? {
          title: 'Cupón QR',
          copyCode: 'Copiar código',
          copyQr: 'Copiar valor QR',
          close: 'Cerrar',
          copied: 'Copiado',
          history: 'Recientes',
          noHistory: 'Sin emisiones previas.',
          showQr: 'Ver QR',
        }
      : {
          title: 'Coupon QR',
          copyCode: 'Copy code',
          copyQr: 'Copy QR value',
          close: 'Close',
          copied: 'Copied',
          history: 'Recent',
          noHistory: 'No previous issues.',
          showQr: 'View QR',
        };

  const loadHistory = useCallback(async () => {
    const rows = await getInfluencerQrIssueHistory();
    setHistory(rows);
  }, []);

  useEffect(() => {
    if (visible) void loadHistory();
  }, [visible, loadHistory]);

  const filteredHistory = useMemo(() => {
    if (!shortCode) return history.slice(0, 8);
    const code = shortCode.replace(/^#/, '');
    return history.filter((h) => h.shortCode === code).slice(0, 8);
  }, [history, shortCode]);

  const copyText = async (text: string, label: string) => {
    if (!text.trim()) return;
    await Clipboard.setStringAsync(text.trim());
    Alert.alert(label, strings.copied);
  };

  const formatWhen = (ts: number) =>
    new Date(ts).toLocaleString(language === 'es' ? 'es' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$1">
            {strings.title}
          </Text>
          {campaignTitle ? (
            <Text fontSize="$xs" color="$textLight600" mb="$2">
              {campaignTitle}
            </Text>
          ) : null}

          <VStack alignItems="center" space="sm" py="$2">
            {qrValue ? (
              <QRCode value={qrValue} size={220} color={brand} backgroundColor="white" />
            ) : null}
            {shortCode ? (
              <Text fontSize="$lg" fontWeight="$bold" color={brand}>
                #{shortCode.replace(/^#/, '')}
              </Text>
            ) : null}
            {referralCode ? (
              <Text fontSize="$2xs" color="$textLight500">
                {referralCode}
              </Text>
            ) : null}
          </VStack>

          <HStack space="sm" mb="$3" flexWrap="wrap">
            {shortCode ? (
              <Button
                flex={1}
                minWidth={120}
                size="sm"
                variant="outline"
                borderColor={brand}
                onPress={() => void copyText(shortCode.replace(/^#/, ''), strings.copyCode)}
              >
                <ButtonText color={brand} fontSize="$xs">
                  {strings.copyCode}
                </ButtonText>
              </Button>
            ) : null}
            {qrValue ? (
              <Button
                flex={1}
                minWidth={120}
                size="sm"
                variant="outline"
                borderColor={brand}
                onPress={() => void copyText(qrValue, strings.copyQr)}
              >
                <ButtonText color={brand} fontSize="$xs">
                  {strings.copyQr}
                </ButtonText>
              </Button>
            ) : null}
          </HStack>

          <Text fontSize="$sm" fontWeight="$semibold" color={brand} mb="$2">
            {strings.history}
          </Text>
          {filteredHistory.length === 0 ? (
            <Text fontSize="$xs" color="$textLight500" mb="$3">
              {strings.noHistory}
            </Text>
          ) : (
            <ScrollView style={styles.historyScroll} nestedScrollEnabled>
              <VStack space="xs" mb="$3">
                {filteredHistory.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => onSelectHistory?.(row)}
                    style={({ pressed }) => [styles.historyRow, pressed && { opacity: 0.85 }]}
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <VStack flex={1} pr="$2">
                        <Text fontSize="$xs" fontWeight="$semibold" color="#111">
                          #{row.shortCode}
                          {row.campaignTitle ? ` · ${row.campaignTitle}` : ''}
                        </Text>
                        <Text fontSize="$2xs" color="$textLight500">
                          {formatWhen(row.createdAt)}
                        </Text>
                      </VStack>
                      <Text fontSize="$2xs" color={brand} fontWeight="$semibold">
                        {strings.showQr}
                      </Text>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            </ScrollView>
          )}

          <Button size="md" bg={brand} onPress={onClose}>
            <ButtonText>{strings.close}</ButtonText>
          </Button>
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
  historyScroll: {
    maxHeight: 160,
  },
  historyRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
});
