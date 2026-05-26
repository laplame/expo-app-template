import React, { useMemo, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  ScrollView,
  VStack,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import FormComponent, { FormField } from '../components/FormComponent';
import { useSettings } from '../context/SettingsContext';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import { useWalletBalance } from '../context/WalletBalanceContext';
import { getKycForm, setKycForm, setUserId } from '../services/storage';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import { requestKycWhatsappCode, verifyKycWhatsappCode } from '../services/kycWhatsappApi';
import { useBrandTheme } from '../theme/useBrandTheme';

const WHATSAPP_KYC_REQUIRED = process.env.EXPO_PUBLIC_KYC_WHATSAPP_REQUIRED === 'true';

// Biometrics only on native; avoid import error on web
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    LocalAuthentication = require('expo-local-authentication');
  }
} catch {
  LocalAuthentication = null;
}

const getDeviceLanguage = (): 'en' | 'es' => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.startsWith('es') ? 'es' : 'en';
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith('es') ? 'es' : 'en';
  } catch {
    return 'en';
  }
};

export default function NYCScreen() {
  const navigation = useNavigation();
  const { language, setUserName } = useSettings();
  const { brand, brandBg, brandBorder } = useBrandTheme();
  const { refreshVerificationAccess } = useVerificationAccess();
  const { grantWelcomeBonus, grantThreeFieldsBonus } = useWalletBalance();
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [hasBiometric, setHasBiometric] = useState<boolean | null>(null);
  const [savedForm, setSavedForm] = useState<Record<string, string> | null>(null);
  const [pendingKycData, setPendingKycData] = useState<Record<string, string> | null>(null);
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappVerificationId, setWhatsappVerificationId] = useState<string | undefined>();
  const [whatsappVerifiedPhone, setWhatsappVerifiedPhone] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  useEffect(() => {
    getKycForm().then((data) => setSavedForm(data));
  }, []);

  const t = {
    title: language === 'es' ? 'Conoce a tu cliente' : 'Know Your Client',
    subtitle:
      language === 'es'
        ? 'Completa tu perfil y verificación'
        : 'Complete your profile and verification',
    status: language === 'es' ? 'Estado de verificación' : 'Verification status',
    pending: language === 'es' ? 'Pendiente' : 'Pending',
    verified: language === 'es' ? 'Verificado' : 'Verified',

    // KYC explanation
    whatIsKyc: language === 'es' ? '¿Qué es KYC?' : 'What is KYC?',
    kycExplanation:
      language === 'es'
        ? 'KYC (Know Your Client / Conoce a tu cliente) es un proceso de verificación de identidad que nos permite cumplir con regulaciones y ofrecerte un servicio seguro. Recopilamos y verificamos datos como tu identidad, dirección y perfil para prevenir fraude y proteger tu cuenta.'
        : 'KYC (Know Your Client) is an identity verification process that allows us to comply with regulations and offer you a secure service. We collect and verify data such as your identity, address and profile to prevent fraud and protect your account.',
    whyKyc: language === 'es' ? '¿Por qué es necesario?' : 'Why is it required?',
    whyKycText:
      language === 'es'
        ? '• Cumplimiento normativo y prevención de lavado de dinero.\n• Protección de tu cuenta y transacciones.\n• Verificación mediante huella o rostro (biométricos) para mayor seguridad.'
        : '• Regulatory compliance and anti-money laundering.\n• Protection of your account and transactions.\n• Verification via fingerprint or face (biometrics) for added security.',

    formTitle: language === 'es' ? 'Datos para verificación KYC' : 'Data for KYC verification',
    submitLabel: language === 'es' ? 'Enviar y verificar con biometría' : 'Submit and verify with biometrics',
    submitSuccess: language === 'es' ? 'Formulario enviado. Verificación biométrica correcta.' : 'Form submitted. Biometric verification successful.',
    submitError: language === 'es' ? 'Error en la verificación.' : 'Verification error.',
    biometricRequired:
      language === 'es'
        ? 'Verificación biométrica requerida para completar el KYC.'
        : 'Biometric verification is required to complete KYC.',
    biometricUnavailable:
      language === 'es'
        ? 'Biometría no disponible en este dispositivo.'
        : 'Biometrics not available on this device.',
    biometricFailed:
      language === 'es'
        ? 'Verificación biométrica fallida o cancelada.'
        : 'Biometric verification failed or was cancelled.',
    tryAgain: language === 'es' ? 'Reintentar' : 'Try again',
    whatsappTitle: language === 'es' ? 'Verificación de WhatsApp' : 'WhatsApp verification',
    whatsappPending:
      language === 'es'
        ? 'Te enviamos un código por WhatsApp. Escríbelo aquí para confirmar que el número es real antes de completar el KYC.'
        : 'We sent you a code via WhatsApp. Enter it here to confirm the number is real before completing KYC.',
    whatsappCodeLabel: language === 'es' ? 'Código recibido por WhatsApp' : 'Code received via WhatsApp',
    whatsappVerify: language === 'es' ? 'Validar WhatsApp' : 'Verify WhatsApp',
    whatsappResend: language === 'es' ? 'Reenviar código' : 'Resend code',
    whatsappSending: language === 'es' ? 'Enviando código...' : 'Sending code...',
    whatsappVerifying: language === 'es' ? 'Validando...' : 'Verifying...',
    whatsappRequired:
      language === 'es'
        ? 'Primero valida el código enviado por WhatsApp.'
        : 'First verify the code sent via WhatsApp.',
    whatsappCodeRequired:
      language === 'es' ? 'Ingresa el código de WhatsApp.' : 'Enter the WhatsApp code.',
    whatsappSendFailed:
      language === 'es'
        ? 'No se pudo enviar el código de WhatsApp.'
        : 'Could not send the WhatsApp code.',
    whatsappVerifyFailed:
      language === 'es'
        ? 'Código inválido o expirado.'
        : 'Invalid or expired code.',
    whatsappRelaxedNotice:
      language === 'es'
        ? 'WhatsApp queda pendiente por ahora porque todavía no hay proveedor OTP configurado.'
        : 'WhatsApp remains pending for now because no OTP provider is configured yet.',

    // Form labels
    fullName: language === 'es' ? 'Nombre completo' : 'Full name',
    idType: language === 'es' ? 'Tipo de documento' : 'ID type',
    idNumber: language === 'es' ? 'Número de documento' : 'ID number',
    dateOfBirth: language === 'es' ? 'Fecha de nacimiento' : 'Date of birth',
    address: language === 'es' ? 'Dirección' : 'Address',
    city: language === 'es' ? 'Ciudad' : 'City',
    country: language === 'es' ? 'País' : 'Country',
    email: language === 'es' ? 'Correo electrónico' : 'Email',
    phone: language === 'es' ? 'Teléfono' : 'Phone',
  };

  // Solo obligatorios para que la app sea funcional: nombre, teléfono, fecha de nacimiento
  const kycFields: FormField[] = useMemo(
    () => [
      { name: 'fullName', label: t.fullName, placeholder: t.fullName, type: 'text', required: true },
      { name: 'idType', label: t.idType, placeholder: language === 'es' ? 'CC, CE, Pasaporte' : 'ID, Passport', type: 'text', required: false },
      { name: 'idNumber', label: t.idNumber, placeholder: t.idNumber, type: 'text', required: false },
      { name: 'dateOfBirth', label: t.dateOfBirth, placeholder: language === 'es' ? 'DD/MM/AAAA' : 'MM/DD/YYYY', type: 'date', required: true },
      { name: 'address', label: t.address, placeholder: t.address, type: 'text', required: false },
      { name: 'city', label: t.city, placeholder: t.city, type: 'text', required: false },
      { name: 'country', label: t.country, placeholder: t.country, type: 'text', required: false },
      { name: 'email', label: t.email, placeholder: t.email, type: 'email', required: false },
      { name: 'phone', label: t.phone, placeholder: t.phone, type: 'text', required: true },
    ],
    [language]
  );

  const checkBiometricSupport = async (): Promise<boolean> => {
    if (!LocalAuthentication) return false;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(hasHardware && isEnrolled);
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  };

  const requestWhatsappVerification = async (data: Record<string, string>) => {
    const phone = data.phone?.trim();
    if (!phone) return;
    setPendingKycData(data);
    setWhatsappLoading(true);
    setWhatsappError(null);
    setWhatsappCode('');
    try {
      const result = await requestKycWhatsappCode(phone);
      if (!result.ok) {
        setWhatsappError(result.error ?? t.whatsappSendFailed);
        return;
      }
      setWhatsappVerificationId(result.verificationId);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const completeKycWithBiometric = async (
    data: Record<string, string>,
    whatsappMeta?: { verified?: boolean; verifiedAt?: string; verificationId?: string; status?: string }
  ) => {
    setBiometricError(null);
    setVerificationStatus('idle');
    const whatsappVerified = whatsappMeta?.verified === true;

    const dataToSave = {
      ...data,
      phoneWhatsappVerified: whatsappVerified ? 'true' : 'false',
      phoneWhatsappVerificationStatus:
        whatsappMeta?.status ?? (WHATSAPP_KYC_REQUIRED ? 'pending' : 'not_required_until_provider_configured'),
      ...(whatsappVerified ? { phoneWhatsappVerifiedAt: whatsappMeta?.verifiedAt ?? new Date().toISOString() } : {}),
      ...(whatsappMeta?.verificationId ? { phoneWhatsappVerificationId: whatsappMeta.verificationId } : {}),
    };
    const name = data.fullName?.trim() || null;
    if (name) setUserName(name);
    await setKycForm(dataToSave);
    getOrCreateDeviceId().then((deviceId) => setUserId(deviceId)).catch(() => {});

    const hasThreeFields = Boolean(data.fullName?.trim() && data.dateOfBirth?.trim() && data.phone?.trim());
    if (hasThreeFields) await grantThreeFieldsBonus();

    if (!LocalAuthentication) {
      setVerificationStatus('success');
      const granted = await grantWelcomeBonus();
      if (granted) {
        // Opcional: Alert.alert('', language === 'es' ? '¡Recibiste 25 LUXAE (25 USD)!' : 'You received 25 LUXAE (25 USD)!');
      }
      await refreshVerificationAccess();
      (navigation as any).navigate('Home');
      return;
    }

    const supported = await checkBiometricSupport();
    if (!supported) {
      setBiometricError(t.biometricUnavailable);
      setVerificationStatus('error');
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.biometricRequired,
        cancelLabel: language === 'es' ? 'Cancelar' : 'Cancel',
        fallbackLabel: language === 'es' ? 'Usar contraseña' : 'Use password',
      });

      if (result.success) {
        setVerificationStatus('success');
        setBiometricError(null);
        const granted = await grantWelcomeBonus();
        if (granted) {
          // Opcional: Alert.alert('', language === 'es' ? '¡Recibiste 25 LUXAE (25 USD)!' : 'You received 25 LUXAE (25 USD)!');
        }
        await refreshVerificationAccess();
        (navigation as any).navigate('Home');
      } else {
        setBiometricError(t.biometricFailed);
        setVerificationStatus('error');
      }
    } catch (err) {
      setBiometricError(t.biometricFailed);
      setVerificationStatus('error');
    }
  };

  const handleSubmitWithBiometric = async (data: Record<string, string>) => {
    const phone = data.phone?.trim();
    if (!phone) return;
    if (WHATSAPP_KYC_REQUIRED && whatsappVerifiedPhone !== phone) {
      await requestWhatsappVerification(data);
      return;
    }
    await completeKycWithBiometric(data, WHATSAPP_KYC_REQUIRED
      ? { verified: true, status: 'verified_local_session' }
      : { verified: false, status: 'not_required_until_provider_configured' });
  };

  const handleVerifyWhatsappCode = async () => {
    const data = pendingKycData;
    const code = whatsappCode.trim();
    if (!data) return;
    if (!code) {
      setWhatsappError(t.whatsappCodeRequired);
      return;
    }
    setWhatsappLoading(true);
    setWhatsappError(null);
    try {
      const phone = data.phone.trim();
      const result = await verifyKycWhatsappCode({
        phone,
        code,
        verificationId: whatsappVerificationId,
      });
      if (!result.ok || result.verified === false) {
        setWhatsappError(result.error ?? t.whatsappVerifyFailed);
        return;
      }
      setWhatsappVerifiedPhone(phone);
      setPendingKycData(null);
      setWhatsappCode('');
      await completeKycWithBiometric(data, {
        verified: true,
        status: 'verified',
        verifiedAt: result.verifiedAt,
        verificationId: whatsappVerificationId,
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView
        flex={1}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 80,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <VStack space="lg" width="100%" minHeight={400}>
          {/* Header */}
          <Box bg={brand} borderRadius="$xl" p="$5">
            <Text fontSize="$2xl" fontWeight="$bold" color="$white">
              NYC
            </Text>
            <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
              {t.subtitle}
            </Text>
          </Box>

          {/* What is KYC - Explicación */}
          <Box width="100%">
            <Text fontSize="$lg" fontWeight="$bold" color={brand} mb="$2">
              {t.whatIsKyc}
            </Text>
            <Text fontSize="$sm" color="$textLight700" lineHeight={22}>
              {t.kycExplanation}
            </Text>
          </Box>

          {/* Why KYC */}
          <Box width="100%">
            <Text fontSize="$lg" fontWeight="$bold" color={brand} mb="$2">
              {t.whyKyc}
            </Text>
            <Text fontSize="$sm" color="$textLight700" lineHeight={22}>
              {t.whyKycText}
            </Text>
          </Box>

          {/* Status */}
          <VStack space="sm" width="100%">
            <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
              {t.status}
            </Text>
            <Box
              bg={
                verificationStatus === 'success'
                  ? 'rgba(34, 197, 94, 0.15)'
                  : verificationStatus === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : '$backgroundLight100'
              }
              borderRadius="$lg"
              p="$4"
              borderLeftWidth={4}
              borderLeftColor={
                verificationStatus === 'success'
                  ? '#22c55e'
                  : verificationStatus === 'error'
                  ? '#ef4444'
                  : brand
              }
            >
              <Text fontSize="$md" color="$textLight900" fontWeight="$medium">
                {verificationStatus === 'success' ? t.verified : t.pending}
              </Text>
              {biometricError && (
                <Text fontSize="$sm" color="$error600" mt="$2">
                  {biometricError}
                </Text>
              )}
              {verificationStatus === 'error' && (
                <Button
                  size="sm"
                  variant="outline"
                  mt="$2"
                  onPress={() => {
                    setVerificationStatus('idle');
                    setBiometricError(null);
                  }}
                >
                  <ButtonText>{t.tryAgain}</ButtonText>
                </Button>
              )}
            </Box>
          </VStack>

          {/* KYC Form - Formulario */}
          <Box width="100%" bg="$backgroundLight50" borderRadius="$lg" p="$4" mt="$2">
            <Text fontSize="$lg" fontWeight="$bold" color="$textLight900" mb="$4">
              {t.formTitle}
            </Text>
            <FormComponent
              key={savedForm === null ? 'loading' : 'ready'}
              title=""
              fields={kycFields}
              submitLabel={t.submitLabel}
              onSubmit={handleSubmitWithBiometric}
              initialValues={savedForm ?? {}}
            />
            {!WHATSAPP_KYC_REQUIRED && (
              <Text fontSize="$xs" color="$textLight500" mt="$3">
                {t.whatsappRelaxedNotice}
              </Text>
            )}
          </Box>

          {WHATSAPP_KYC_REQUIRED && pendingKycData && (
            <Box width="100%" bg="$backgroundLight50" borderRadius="$lg" p="$4" borderWidth={1} borderColor={brand}>
              <VStack space="md">
                <Text fontSize="$lg" fontWeight="$bold" color={brand}>
                  {t.whatsappTitle}
                </Text>
                <Text fontSize="$sm" color="$textLight700" lineHeight={20}>
                  {t.whatsappPending}
                </Text>
                <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                  {pendingKycData.phone}
                </Text>
                <Input>
                  <InputField
                    value={whatsappCode}
                    onChangeText={setWhatsappCode}
                    placeholder={t.whatsappCodeLabel}
                    keyboardType="number-pad"
                  />
                </Input>
                {whatsappError ? (
                  <Text fontSize="$sm" color="$error600">
                    {whatsappError}
                  </Text>
                ) : null}
                <Button bg={brand} onPress={handleVerifyWhatsappCode} isDisabled={whatsappLoading}>
                  <ButtonText>{whatsappLoading ? t.whatsappVerifying : t.whatsappVerify}</ButtonText>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => requestWhatsappVerification(pendingKycData)}
                  isDisabled={whatsappLoading}
                >
                  <ButtonText>{whatsappLoading ? t.whatsappSending : t.whatsappResend}</ButtonText>
                </Button>
              </VStack>
            </Box>
          )}
        </VStack>
      </ScrollView>
    </Box>
  );
}
