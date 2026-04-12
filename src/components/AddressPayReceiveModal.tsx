import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Pressable as RNPressable,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import { getUserId, getWalletAddresses } from '../services/storage';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import * as WalletQr from '../utils/walletQr';
import { formatAddressForUi } from '../utils/addressDisplay';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import WalletQrCameraPanel from './WalletQrCameraPanel';

function modalTranslations(language: 'en' | 'es') {
  if (language === 'es') {
    return {
      title: 'Tu identificación',
      subtitle: 'ID de usuario y dispositivo. La dirección por defecto en Billetera se usa en este QR.',
      qrPay: 'Pagar',
      qrReceive: 'Cobrar',
      qrIntentHint: 'Pagar: muestra tu QR. Cobrar: escanea el QR del pagador con la cámara.',
      qrNoWalletHint:
        'Sin dirección en Billetera: puedes cobrar escaneando abajo. Añade una dirección para que tu QR de pago incluya tu cuenta.',
      goToWallet: 'Ir a Billetera',
      close: 'Cerrar',
      payAmountLabel: `Importe a pagar (${TOKEN_SYMBOL})`,
      payMaxHint: `Límite máximo por pago: %s ${TOKEN_SYMBOL} (cámbialo en Configuración).`,
      payExceeded: `Superas el límite de pago. Reduce el importe o sube el límite en Configuración.`,
      payNeedAmount: `Introduce el importe en ${TOKEN_SYMBOL} para generar el QR de pago.`,
      goToSettingsLimit: 'Ir a Configuración (límite)',
      scanTitle: 'Escanear QR (cobrar)',
      scanHint: 'Apunta la cámara al código QR de quien paga.',
      scanResult: 'QR leído',
      grantCamera: 'Permitir cámara',
      cameraDenied: 'No hay permiso de cámara. Actívalo en Configuración del sistema.',
      addressMaskedHint:
        'Completa verificación KYC o KYB para ver la dirección completa. El QR sigue siendo válido.',
    };
  }
  return {
    title: 'Your identification',
    subtitle: 'User and device ID. Your default Wallet address is used in this QR.',
    qrPay: 'Pay',
    qrReceive: 'Receive',
    qrIntentHint: 'Pay: show your QR. Receive: scan the payer’s QR with the camera.',
    qrNoWalletHint:
      'No Wallet address yet: you can still receive by scanning below. Add an address so your pay QR includes your account.',
    goToWallet: 'Go to Wallet',
    close: 'Close',
    payAmountLabel: `Amount to pay (${TOKEN_SYMBOL})`,
    payMaxHint: `Max per payment: %s ${TOKEN_SYMBOL} (change it in Settings).`,
    payExceeded: 'This exceeds your payment limit. Lower the amount or raise the limit in Settings.',
    payNeedAmount: `Enter the ${TOKEN_SYMBOL} amount to generate the pay QR.`,
    goToSettingsLimit: 'Go to Settings (limit)',
    scanTitle: 'Scan QR (receive)',
    scanHint: 'Point the camera at the payer’s QR code.',
    scanResult: 'QR scanned',
    grantCamera: 'Allow camera',
    cameraDenied: 'Camera permission denied. Enable it in system Settings.',
    addressMaskedHint:
      'Complete KYC or KYB to see your full address. The QR code still encodes the correct address.',
  };
}

export interface AddressPayReceiveModalProps {
  visible: boolean;
  onClose: () => void;
  /** Si se indica, se usa esta dirección (ej. tarjeta de red en Wallet). */
  addressOverride?: string | null;
  /** Etiqueta opcional (ej. "Ethereum"). */
  chainLabel?: string;
  /** Al abrir el modal, pestaña inicial. */
  initialIntent?: 'pay' | 'receive';
}

export default function AddressPayReceiveModal({
  visible,
  onClose,
  addressOverride,
  chainLabel,
  initialIntent = 'receive',
}: AddressPayReceiveModalProps) {
  const navigation = useNavigation();
  const settings = useSettings();
  const { revealWalletAddresses, refreshVerificationAccess } = useVerificationAccess();
  const language = settings.language === 'es' ? 'es' : 'en';
  const paymentLimitLuxae = settings.paymentLimitLuxae ?? 20;

  const lang = language;
  const t = useMemo(() => modalTranslations(lang), [lang]);

  const [userQrIntent, setUserQrIntent] = useState<'pay' | 'receive'>('receive');
  const [payAmountInput, setPayAmountInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [userIdForQr, setUserIdForQr] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const lastScanAt = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setUserQrIntent(initialIntent);
    setPayAmountInput('');
    let cancelled = false;
    (async () => {
      const uid = await getUserId();
      const dev = await getOrCreateDeviceId().catch(() => '');
      const list = await getWalletAddresses();
      const picked = WalletQr.pickDefaultWalletAddress(list);
      const addr = addressOverride != null && addressOverride.trim() !== '' ? addressOverride.trim() : picked;
      if (!cancelled) {
        setUserIdForQr(uid || '');
        setDeviceId(dev || '');
        setResolvedAddress(addr);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, initialIntent, addressOverride]);

  useEffect(() => {
    if (visible) refreshVerificationAccess();
  }, [visible, refreshVerificationAccess]);

  const payAmountParsed = useMemo(() => {
    const raw = payAmountInput.trim().replace(',', '.');
    if (!raw) return NaN;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : NaN;
  }, [payAmountInput]);

  const payBlockedByLimit = useMemo(
    () =>
      userQrIntent === 'pay' &&
      resolvedAddress != null &&
      Number.isFinite(payAmountParsed) &&
      payAmountParsed > paymentLimitLuxae,
    [userQrIntent, resolvedAddress, payAmountParsed, paymentLimitLuxae]
  );

  const payNeedsAmount = useMemo(
    () =>
      userQrIntent === 'pay' &&
      resolvedAddress != null &&
      (!Number.isFinite(payAmountParsed) || payAmountParsed <= 0),
    [userQrIntent, resolvedAddress, payAmountParsed]
  );

  const userQRValue = useMemo(() => {
    if (userQrIntent === 'pay' && resolvedAddress) {
      if (payBlockedByLimit || payNeedsAmount) return '';
      return WalletQr.buildIdentificationQr('pay', resolvedAddress, userIdForQr, deviceId, payAmountParsed);
    }
    if (userQrIntent === 'receive') {
      return '';
    }
    return WalletQr.buildIdentificationQr(userQrIntent, resolvedAddress, userIdForQr, deviceId);
  }, [
    userQrIntent,
    resolvedAddress,
    userIdForQr,
    deviceId,
    payBlockedByLimit,
    payNeedsAmount,
    payAmountParsed,
  ]);

  const onQrPayload = useCallback(
    (data: string) => {
      const now = Date.now();
      if (now - lastScanAt.current < 2000) return;
      lastScanAt.current = now;
      Alert.alert(t.scanResult, data || '(vacío)', [
        { text: t.close, onPress: () => {} },
      ]);
    },
    [t]
  );

  const nav = (name: string) => {
    onClose();
    (navigation as any).navigate(name);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <RNPressable
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={onClose}
        />
        <View style={{ width: '100%', maxWidth: 360, paddingHorizontal: 20, zIndex: 1, maxHeight: '92%' }} pointerEvents="box-none">
          <ScrollView
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
          >
            <Box bg="$white" borderRadius="$2xl" p="$5" alignItems="center" width="100%">
              <Text fontSize="$lg" fontWeight="$bold" color="#00704A" mb="$1">
                {t.title}
              </Text>
              {chainLabel ? (
                <Text fontSize="$xs" color="#00704A" fontWeight="$semibold" mb="$1">
                  {chainLabel}
                </Text>
              ) : null}
              <Text fontSize="$sm" color="$textLight600" mb="$2" textAlign="center">
                {t.subtitle}
              </Text>
              {resolvedAddress ? (
                <VStack space="xs" mb="$2" width="100%">
                  <Text fontSize="$xs" color="$textLight700" textAlign="center" selectable>
                    {formatAddressForUi(resolvedAddress, revealWalletAddresses)}
                  </Text>
                  {!revealWalletAddresses ? (
                    <Text fontSize="$xs" color="$textLight500" textAlign="center">
                      {t.addressMaskedHint}
                    </Text>
                  ) : null}
                </VStack>
              ) : (
                <Text fontSize="$xs" color="$textLight500" mb="$2" textAlign="center">
                  {t.qrNoWalletHint}
                </Text>
              )}
              <Text fontSize="$xs" color="$textLight500" mb="$3" textAlign="center">
                {t.qrIntentHint}
              </Text>
              <HStack space="sm" width="100%" mb="$3">
                <Button
                  flex={1}
                  size="sm"
                  variant={userQrIntent === 'pay' ? 'solid' : 'outline'}
                  bg={userQrIntent === 'pay' ? '#00704A' : 'transparent'}
                  borderColor="#00704A"
                  onPress={() => setUserQrIntent('pay')}
                >
                  <ButtonText color={userQrIntent === 'pay' ? '$white' : '#00704A'}>{t.qrPay}</ButtonText>
                </Button>
                <Button
                  flex={1}
                  size="sm"
                  variant={userQrIntent === 'receive' ? 'solid' : 'outline'}
                  bg={userQrIntent === 'receive' ? '#00704A' : 'transparent'}
                  borderColor="#00704A"
                  onPress={() => {
                    setUserQrIntent('receive');
                    setPayAmountInput('');
                  }}
                >
                  <ButtonText color={userQrIntent === 'receive' ? '$white' : '#00704A'}>{t.qrReceive}</ButtonText>
                </Button>
              </HStack>

              {userQrIntent === 'pay' && resolvedAddress ? (
                <VStack space="sm" width="100%" mb="$3">
                  <Text fontSize="$sm" fontWeight="$medium" color="$textLight800" alignSelf="flex-start">
                    {t.payAmountLabel}
                  </Text>
                  <Input size="md" borderRadius="$lg" borderColor="$borderLight300" width="100%">
                    <InputField
                      placeholder="0"
                      value={payAmountInput}
                      onChangeText={setPayAmountInput}
                      keyboardType="decimal-pad"
                      autoCapitalize="none"
                    />
                  </Input>
                  <Text fontSize="$xs" color="$textLight500">
                    {t.payMaxHint.replace('%s', String(paymentLimitLuxae))}
                  </Text>
                </VStack>
              ) : null}

              {userQrIntent === 'pay' && resolvedAddress && payBlockedByLimit ? (
                <VStack space="md" width="100%" mb="$3" alignItems="center">
                  <Text fontSize="$sm" color="#B91C1C" textAlign="center">
                    {t.payExceeded}
                  </Text>
                  <VStack space="sm" width="100%">
                    <Button size="md" bg="#00704A" width="100%" onPress={() => nav('Wallet')}>
                      <ButtonText>{t.goToWallet}</ButtonText>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="#00704A"
                      width="100%"
                      onPress={() => nav('Settings')}
                    >
                      <ButtonText color="#00704A">{t.goToSettingsLimit}</ButtonText>
                    </Button>
                  </VStack>
                </VStack>
              ) : userQrIntent === 'pay' && resolvedAddress && payNeedsAmount ? (
                <Text fontSize="$sm" color="$textLight600" textAlign="center" mb="$3">
                  {t.payNeedAmount}
                </Text>
              ) : userQrIntent === 'pay' && userQRValue ? (
                <Box bg="$white" p="$4" borderRadius="$lg" borderWidth={1} borderColor="$borderLight200" mb="$3">
                  <QRCode value={userQRValue} size={200} color="#00704A" backgroundColor="white" />
                </Box>
              ) : userQrIntent === 'receive' ? (
                <VStack space="sm" width="100%" mb="$3">
                  <Text fontSize="$sm" fontWeight="$semibold" color="$textLight800" alignSelf="flex-start">
                    {t.scanTitle}
                  </Text>
                  <Text fontSize="$xs" color="$textLight500" mb="$1">
                    {t.scanHint}
                  </Text>
                  <WalletQrCameraPanel
                    onBarcodeScanned={(r) => onQrPayload(r.data ?? '')}
                    grantCameraLabel={t.grantCamera}
                    cameraDeniedLabel={t.cameraDenied}
                  />
                </VStack>
              ) : null}

              {!resolvedAddress ? (
                <Button
                  mt="$2"
                  size="sm"
                  variant="outline"
                  borderColor="#00704A"
                  width="100%"
                  onPress={() => nav('Wallet')}
                >
                  <ButtonText color="#00704A">{t.goToWallet}</ButtonText>
                </Button>
              ) : null}

              <Button mt="$4" size="md" bg="#00704A" width="100%" onPress={onClose}>
                <ButtonText>{t.close}</ButtonText>
              </Button>
            </Box>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
