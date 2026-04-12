import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Text,
  ScrollView,
  VStack,
  Pressable,
  HStack,
  Button,
  ButtonText,
  Input,
  InputField,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Alert, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings, Language, Currency } from '../context/SettingsContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import { getPreferredMall, setPreferredMall, type PreferredMall } from '../services/storage';
import { getStoresNearUser } from '../data/nearbyStores';

export default function SettingsScreen() {
  const { language, currency, setLanguage, setCurrency, paymentLimitLuxae, setPaymentLimitLuxae } = useSettings();
  const [preferredMall, setPreferredMallState] = useState<PreferredMall | null>(null);
  const [paymentLimitDraft, setPaymentLimitDraft] = useState(String(paymentLimitLuxae));

  useEffect(() => {
    setPaymentLimitDraft(String(paymentLimitLuxae));
  }, [paymentLimitLuxae]);

  const storeOptions = useMemo(() => {
    const stores = getStoresNearUser(null, null, 8);
    return stores.map((s) => ({ id: s.id, name: s.name, nameEs: s.nameEs }));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPreferredMall().then(setPreferredMallState);
    }, [])
  );

  const handleSelectStore = (store: PreferredMall | null) => {
    if (store == null) {
      setPreferredMall(null);
      setPreferredMallState(null);
      return;
    }
    const next = preferredMall?.id === store.id ? null : store;
    setPreferredMall(next);
    setPreferredMallState(next);
  };

  const t = {
    title: language === 'es' ? 'Configuración' : 'Settings',
    language: language === 'es' ? 'Idioma' : 'Language',
    currency: language === 'es' ? 'Moneda' : 'Currency',
    preferredMall: language === 'es' ? 'Tienda preferida' : 'Preferred Mall',
    none: language === 'es' ? 'Ninguno' : 'None',
    english: 'English',
    spanish: 'Español',
    usd: 'USD (Dólares)',
    mxn: 'MXN (Pesos mexicanos)',
    paymentLimitTitle: language === 'es' ? `Límite de pago (${TOKEN_SYMBOL})` : `Payment limit (${TOKEN_SYMBOL})`,
    paymentLimitHint:
      language === 'es'
        ? 'Máximo por operación al usar «Pagar» en el QR de identificación. Si el importe lo supera, se te pedirá ir a Billetera.'
        : 'Maximum per transaction when using “Pay” on the ID QR. If the amount exceeds it, you will be prompted to open Wallet.',
    paymentLimitSave: language === 'es' ? 'Guardar límite' : 'Save limit',
    paymentLimitSaved: language === 'es' ? 'Límite guardado' : 'Limit saved',
    paymentLimitInvalid: language === 'es' ? 'Introduce un número entero ≥ 1' : 'Enter a whole number ≥ 1',
  };

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <VStack space="lg">
          {/* Language */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
              {t.language}
            </Text>
            <HStack space="sm" flexWrap="wrap">
              <Pressable
                flex={1}
                minWidth={120}
                bg={language === 'en' ? '#00704A' : '$backgroundLight100'}
                borderRadius="$lg"
                p="$4"
                onPress={() => setLanguage('en' as Language)}
              >
                <Text
                  fontSize="$md"
                  fontWeight="$medium"
                  color={language === 'en' ? '$white' : '$textLight700'}
                  textAlign="center"
                >
                  {t.english}
                </Text>
              </Pressable>
              <Pressable
                flex={1}
                minWidth={120}
                bg={language === 'es' ? '#00704A' : '$backgroundLight100'}
                borderRadius="$lg"
                p="$4"
                onPress={() => setLanguage('es' as Language)}
              >
                <Text
                  fontSize="$md"
                  fontWeight="$medium"
                  color={language === 'es' ? '$white' : '$textLight700'}
                  textAlign="center"
                >
                  {t.spanish}
                </Text>
              </Pressable>
            </HStack>
          </VStack>

          {/* Currency */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
              {t.currency}
            </Text>
            <HStack space="sm" flexWrap="wrap">
              <Pressable
                flex={1}
                minWidth={120}
                bg={currency === 'USD' ? '#00704A' : '$backgroundLight100'}
                borderRadius="$lg"
                p="$4"
                onPress={() => setCurrency('USD')}
              >
                <Text
                  fontSize="$md"
                  fontWeight="$medium"
                  color={currency === 'USD' ? '$white' : '$textLight700'}
                  textAlign="center"
                >
                  {t.usd}
                </Text>
              </Pressable>
              <Pressable
                flex={1}
                minWidth={120}
                bg={currency === 'MXN' ? '#00704A' : '$backgroundLight100'}
                borderRadius="$lg"
                p="$4"
                onPress={() => setCurrency('MXN')}
              >
                <Text
                  fontSize="$md"
                  fontWeight="$medium"
                  color={currency === 'MXN' ? '$white' : '$textLight700'}
                  textAlign="center"
                >
                  {t.mxn}
                </Text>
              </Pressable>
            </HStack>
          </VStack>

          {/* Límite de pago LUXAE */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
              {t.paymentLimitTitle}
            </Text>
            <Text fontSize="$sm" color="$textLight600">
              {t.paymentLimitHint}
            </Text>
            <HStack space="sm" alignItems="center">
              <Input flex={1} size="md" borderRadius="$lg" borderColor="$borderLight300">
                <InputField
                  placeholder="20"
                  value={paymentLimitDraft}
                  onChangeText={setPaymentLimitDraft}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </Input>
              <Button
                size="md"
                bg="#00704A"
                onPress={async () => {
                  const n = Math.floor(
                    parseFloat(String(paymentLimitDraft).trim().replace(',', '.'))
                  );
                  if (!Number.isFinite(n) || n < 1) {
                    Alert.alert(t.title, t.paymentLimitInvalid);
                    return;
                  }
                  await setPaymentLimitLuxae(n);
                  Alert.alert(t.title, t.paymentLimitSaved, [{ text: 'OK' }]);
                }}
              >
                <ButtonText>{t.paymentLimitSave}</ButtonText>
              </Button>
            </HStack>
          </VStack>

          {/* Preferred mall */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
              {t.preferredMall}
            </Text>
            <Pressable
              flex={1}
              minWidth={120}
              bg={preferredMall == null ? '#00704A' : '$backgroundLight100'}
              borderRadius="$lg"
              p="$4"
              onPress={() => handleSelectStore(null)}
            >
              <Text
                fontSize="$md"
                fontWeight="$medium"
                color={preferredMall == null ? '$white' : '$textLight700'}
                textAlign="center"
              >
                {t.none}
              </Text>
            </Pressable>
            <HStack space="sm" flexWrap="wrap">
              {storeOptions.map((store) => {
                const selected = preferredMall?.id === store.id;
                const displayName = language === 'es' ? (store.nameEs ?? store.name) : store.name;
                return (
                  <Pressable
                    key={store.id}
                    flex={1}
                    minWidth={140}
                    bg={selected ? '#00704A' : '$backgroundLight100'}
                    borderRadius="$lg"
                    p="$4"
                    onPress={() => handleSelectStore({ id: store.id, name: store.name, nameEs: store.nameEs })}
                  >
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={selected ? '$white' : '$textLight700'}
                      textAlign="center"
                      numberOfLines={2}
                    >
                      {displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}
