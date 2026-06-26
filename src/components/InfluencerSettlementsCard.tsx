import React, { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { Box, Text, VStack, HStack, Button, ButtonText } from '@gluestack-ui/themed';
import type { InfluencerSettlementsConfig } from '../services/influencerAppApi';

type Props = {
  settlements?: InfluencerSettlementsConfig;
  dashboardAccess: boolean;
  language: 'es' | 'en';
  brand: string;
  onProcessPending: () => Promise<{ ok: boolean; error?: string; processed?: number }>;
};

export default function InfluencerSettlementsCard({
  settlements,
  dashboardAccess,
  language,
  brand,
  onProcessPending,
}: Props) {
  const [processing, setProcessing] = useState(false);

  const strings =
    language === 'es'
      ? {
          title: 'Abonos por canje',
          pending: 'Pendiente',
          paid: 'Pagado',
          process: 'Procesar abonos pendientes',
          processing: 'Procesando…',
          noWallet: 'Configura tu wallet en la app para recibir abonos.',
          disabled: 'Disponible cuando tu identidad esté verificada.',
          token: 'Token',
          none: 'Sin abonos registrados aún.',
        }
      : {
          title: 'Redemption payouts',
          pending: 'Pending',
          paid: 'Paid',
          process: 'Process pending payouts',
          processing: 'Processing…',
          noWallet: 'Set up your wallet in the app to receive payouts.',
          disabled: 'Available once your identity is verified.',
          token: 'Token',
          none: 'No payouts recorded yet.',
        };

  if (!settlements?.enabled && !dashboardAccess) return null;

  const summary = settlements?.summary;
  const pendingUsd = summary?.pendingAmountUsd ?? 0;
  const paidUsd = summary?.paidAmountUsd ?? 0;
  const pendingCount = summary?.pendingCount ?? 0;
  const needsWallet = settlements?.payoutWalletRequired && !settlements?.payoutWallet;

  const handleProcess = async () => {
    if (needsWallet) {
      Alert.alert(
        language === 'es' ? 'Wallet requerida' : 'Wallet required',
        strings.noWallet
      );
      return;
    }
    setProcessing(true);
    try {
      const res = await onProcessPending();
      if (!res.ok) {
        Alert.alert(
          language === 'es' ? 'Error' : 'Error',
          res.error ?? (language === 'es' ? 'No se pudo procesar' : 'Could not process')
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box
      bg="$white"
      borderRadius="$xl"
      p="$4"
      mb="$4"
      borderWidth={1}
      borderColor="$borderLight200"
    >
      <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$3">
        {strings.title}
      </Text>

      {!dashboardAccess ? (
        <Text fontSize="$sm" color="$textLight600" lineHeight="$md">
          {strings.disabled}
        </Text>
      ) : !summary ? (
        <Text fontSize="$sm" color="$textLight500">
          {strings.none}
        </Text>
      ) : (
        <VStack space="md">
          <HStack space="md">
            <Box flex={1} bg="#fef3c7" borderRadius="$lg" p="$3">
              <Text fontSize="$xs" color="#92400e">
                {strings.pending}
              </Text>
              <Text fontSize="$xl" fontWeight="$bold" color="#92400e">
                ${pendingUsd.toFixed(2)}
              </Text>
              <Text fontSize="$2xs" color="#92400e">
                {pendingCount} {language === 'es' ? 'canjes' : 'redemptions'}
              </Text>
            </Box>
            <Box flex={1} bg="#dcfce7" borderRadius="$lg" p="$3">
              <Text fontSize="$xs" color="#166534">
                {strings.paid}
              </Text>
              <Text fontSize="$xl" fontWeight="$bold" color="#166534">
                ${paidUsd.toFixed(2)}
              </Text>
              <Text fontSize="$2xs" color="#166534">
                {summary.paidCount ?? 0} {language === 'es' ? 'pagados' : 'paid'}
              </Text>
            </Box>
          </HStack>

          {settlements?.tokenSymbol ? (
            <Text fontSize="$2xs" color="$textLight500">
              {strings.token}: {settlements.tokenSymbol}
              {settlements.transferMethod ? ` · ${settlements.transferMethod}` : ''}
            </Text>
          ) : null}

          {needsWallet ? (
            <Text fontSize="$xs" color="#b45309">
              {strings.noWallet}
            </Text>
          ) : pendingCount > 0 ? (
            <Button size="md" bg={brand} onPress={() => void handleProcess()} isDisabled={processing}>
              {processing ? (
                <HStack space="sm" alignItems="center">
                  <ActivityIndicator color="#fff" size="small" />
                  <ButtonText>{strings.processing}</ButtonText>
                </HStack>
              ) : (
                <ButtonText>{strings.process}</ButtonText>
              )}
            </Button>
          ) : null}
        </VStack>
      )}
    </Box>
  );
}
