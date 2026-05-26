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
  Spinner,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Alert, Image, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings, Language, Currency, type AppThemeId } from '../context/SettingsContext';
import { getAppTheme } from '../theme/appThemes';
import AppThemePicker from '../components/AppThemePicker';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import { getPreferredMall, setPreferredMall, type PreferredMall } from '../services/storage';
import { getStoresNearUser } from '../data/nearbyStores';
import {
  fetchBizneAiShops,
  filterBizneAiCafeSectionShops,
  bizneShopToPreferredMall,
  bizneAiShopCanonicalId,
  postBizneAiCafePreference,
  type BizneAiShop,
} from '../services/bizneAiShopApi';
import { getOrCreateDeviceId } from '../services/deviceIdentity';
import {
  APP_BACKGROUND_PRESETS,
  DEFAULT_APP_BACKGROUND_URI,
  normalizeAppBackgroundUri,
} from '../constants/appBackground';

export default function SettingsScreen() {
  const {
    language,
    currency,
    appTheme,
    setLanguage,
    setCurrency,
    setAppTheme,
    appBackgroundUri,
    setAppBackgroundUri,
    paymentLimitLuxae,
    setPaymentLimitLuxae,
  } = useSettings();
  const [backgroundDraft, setBackgroundDraft] = useState(appBackgroundUri);
  const [preferredMall, setPreferredMallState] = useState<PreferredMall | null>(null);
  const [paymentLimitDraft, setPaymentLimitDraft] = useState(String(paymentLimitLuxae));
  const [bizneCafes, setBizneCafes] = useState<BizneAiShop[]>([]);
  const [bizneLoading, setBizneLoading] = useState(false);
  const [bizneError, setBizneError] = useState<string | null>(null);
  /** Solo ES: café resaltado antes de pulsar «Guardar café preferido». */
  const [biznePendingShopId, setBiznePendingShopId] = useState<string | null>(null);

  useEffect(() => {
    setPaymentLimitDraft(String(paymentLimitLuxae));
  }, [paymentLimitLuxae]);

  useEffect(() => {
    setBackgroundDraft(appBackgroundUri);
  }, [appBackgroundUri]);

  const storeOptions = useMemo(() => {
    const stores = getStoresNearUser(null, null, 12);
    return stores.map((s) => ({ id: s.id, name: s.name, nameEs: s.nameEs }));
  }, []);

  const loadBizneCafes = useCallback(async () => {
    setBizneLoading(true);
    setBizneError(null);
    const res = await fetchBizneAiShops();
    setBizneLoading(false);
    if (!res.ok) {
      setBizneError(res.error ?? 'Error');
      setBizneCafes([]);
      return;
    }
    setBizneCafes(filterBizneAiCafeSectionShops(res.shops));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getPreferredMall().then((m) => {
        setPreferredMallState(m);
        if (language === 'es') {
          setBiznePendingShopId(m?.source === 'bizneai' ? m.id : null);
        }
      });
      loadBizneCafes();
    }, [loadBizneCafes, language])
  );

  const postBizneSync = useCallback(async (prev: PreferredMall | null, next: PreferredMall | null) => {
    const postUrl = process.env.EXPO_PUBLIC_BIZNEAI_CAFE_STATUS_POST_URL?.trim();
    if (!postUrl) return;
    let deviceId: string;
    try {
      deviceId = await getOrCreateDeviceId();
    } catch {
      return;
    }
    const selectedAt = new Date().toISOString();
    if (next?.source === 'bizneai') {
      await postBizneAiCafePreference({
        status: 'selected',
        shopId: next.id,
        shopName: next.name,
        storeType: next.bizneStoreType,
        deviceId,
        programId: 'link4deal_coffee_10_1',
        selectedAt,
        fullAddress: next.fullAddress,
      });
      return;
    }
    if (prev?.source === 'bizneai') {
      await postBizneAiCafePreference({
        status: 'cleared',
        deviceId,
        programId: 'link4deal_coffee_10_1',
        selectedAt,
      });
    }
  }, []);

  const applyBiznePreferred = useCallback(
    (shop: BizneAiShop) => {
      const prev = preferredMall;
      const mall = bizneShopToPreferredMall(shop);
      if (!mall) return;
      setPreferredMall(mall);
      setPreferredMallState(mall);
      postBizneSync(prev, mall).catch(() => {});
    },
    [preferredMall, postBizneSync]
  );

  const clearBiznePreferred = useCallback(() => {
    const prev = preferredMall;
    if (prev?.source !== 'bizneai') return;
    setPreferredMall(null);
    setPreferredMallState(null);
    postBizneSync(prev, null).catch(() => {});
  }, [preferredMall, postBizneSync]);

  /** EN (y otros): un toque guarda o quita. ES solo marca pendiente; guardar con botón. */
  const handleSelectBizneCafe = useCallback(
    (shop: BizneAiShop) => {
      const canonical = bizneAiShopCanonicalId(shop);
      const selectedHere = preferredMall?.id === canonical && preferredMall?.source === 'bizneai';
      if (selectedHere) clearBiznePreferred();
      else applyBiznePreferred(shop);
    },
    [preferredMall, applyBiznePreferred, clearBiznePreferred]
  );

  useEffect(() => {
    if (language !== 'es') setBiznePendingShopId(null);
  }, [language]);

  const handleSelectStore = (store: PreferredMall | null) => {
    const prev = preferredMall;
    if (store == null) {
      setPreferredMall(null);
      setPreferredMallState(null);
      postBizneSync(prev, null).catch(() => {});
      return;
    }
    const next = preferredMall?.id === store.id ? null : store;
    if (next == null) {
      setPreferredMall(null);
      setPreferredMallState(null);
      postBizneSync(prev, null).catch(() => {});
      return;
    }
    const withSource: PreferredMall = { ...next, source: next.source ?? 'nearby_mock' };
    setPreferredMall(withSource);
    setPreferredMallState(withSource);
    postBizneSync(prev, withSource).catch(() => {});
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
    bizneCafesTitle: language === 'es' ? 'BizneAI · Cafés' : 'BizneAI · Cafés',
    bizneCafesSubtitle:
      language === 'es'
        ? 'Solo locales del catálogo aptos para café / restaurante con LUXAE. El que elijas activa «10 cafés = 1 gratis» en Inicio.'
        : 'Only BizneAI venues suited for café / restaurant with LUXAE. Your choice activates “10 coffees = 1 free” on Home.',
    bizneLoading: language === 'es' ? 'Cargando cafés…' : 'Loading cafés…',
    bizneRetry: language === 'es' ? 'Reintentar catálogo' : 'Retry catalogue',
    bizneEmpty:
      language === 'es'
        ? 'No hay cafés disponibles en el catálogo BizneAI con los filtros actuales.'
        : 'No cafés available in the BizneAI catalogue with the current filters.',
    biznePostHint:
      language === 'es'
        ? 'Opcional: configura EXPO_PUBLIC_BIZNEAI_CAFE_STATUS_POST_URL para avisar a BizneAI al elegir café.'
        : 'Optional: set EXPO_PUBLIC_BIZNEAI_CAFE_STATUS_POST_URL to notify BizneAI when you pick a café.',
    bizneEsFlowHint:
      'Toca un café de la lista y, cuando quieras fijarlo, pulsa «Guardar café preferido».',
    bizneSavePreferred: 'Guardar café preferido',
    bizneSavedPreferred:
      'Café preferido guardado. En Inicio se usará para «10 cafés = 1 gratis».',
    bizneSelectFirstHint: 'Elige primero un café de la lista.',
    appearanceTitle: language === 'es' ? 'Colores de entorno' : 'Environment colors',
    appearanceHint:
      language === 'es'
        ? 'Afecta Social Layer, Ajustes y la barra del menú lateral.'
        : 'Affects Social Layer, Settings, and the side menu header.',
    backgroundTitle: language === 'es' ? 'Fondo de la app' : 'App background',
    backgroundHint:
      language === 'es'
        ? 'Misma imagen en Inicio, menú lateral (☰) y paneles de Social Layer.'
        : 'Same image on Home, side drawer menu (☰), and Social Layer panels.',
    backgroundUrlPh: 'https://…',
    backgroundSave: language === 'es' ? 'Guardar fondo' : 'Save background',
    backgroundSaved: language === 'es' ? 'Fondo actualizado' : 'Background updated',
    backgroundInvalid:
      language === 'es' ? 'URL debe empezar con http:// o https://' : 'URL must start with http:// or https://',
    backgroundReset: language === 'es' ? 'Restaurar predeterminado' : 'Restore default',
  };

  const themeDef = getAppTheme(appTheme);
  const settingsBg = themeDef.colors.bg;
  const settingsTitleColor = themeDef.isDark ? '$white' : '$textLight900';
  const settingsMutedColor = themeDef.isDark ? '#a8a8a8' : '$textLight600';
  const inactiveChipBg = themeDef.isDark ? themeDef.colors.elevated : '$backgroundLight100';
  const inactiveChipText = themeDef.isDark ? '#d8d8d8' : '$textLight700';

  return (
    <Box flex={1} bg={settingsBg}>
      <StatusBar style={themeDef.isDark ? 'light' : 'dark'} />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <VStack space="lg">
          <Text fontSize="$2xl" fontWeight="$bold" color={settingsTitleColor}>
            {t.title}
          </Text>

          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
              {t.appearanceTitle}
            </Text>
            <Text fontSize="$sm" color={settingsMutedColor}>
              {t.appearanceHint}
            </Text>
            <AppThemePicker
              language={language}
              selected={appTheme}
              onSelect={(id: AppThemeId) => setAppTheme(id)}
              titleColor={settingsTitleColor}
              mutedColor={settingsMutedColor}
              chipBg={inactiveChipBg}
              activeBrand={themeDef.brand}
            />
          </VStack>

          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
              {t.backgroundTitle}
            </Text>
            <Text fontSize="$sm" color={settingsMutedColor}>
              {t.backgroundHint}
            </Text>
            <Image
              source={{ uri: backgroundDraft }}
              style={{ width: '100%', height: 100, borderRadius: 12 }}
              resizeMode="cover"
            />
            <VStack space="xs">
              {APP_BACKGROUND_PRESETS.map((preset) => {
                const label = language === 'es' ? preset.labelEs : preset.labelEn;
                const selected = backgroundDraft === preset.uri;
                return (
                  <Pressable
                    key={preset.id}
                    bg={selected ? themeDef.brand : inactiveChipBg}
                    borderRadius="$lg"
                    p="$3"
                    onPress={() => setBackgroundDraft(preset.uri)}
                  >
                    <Text
                      fontSize="$sm"
                      fontWeight="$medium"
                      color={selected ? '$white' : inactiveChipText}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </VStack>
            <Input variant="outline" size="md">
              <InputField
                value={backgroundDraft}
                onChangeText={setBackgroundDraft}
                placeholder={t.backgroundUrlPh}
                autoCapitalize="none"
                autoCorrect={false}
                color={themeDef.isDark ? '$white' : '$textLight900'}
              />
            </Input>
            <HStack space="sm" flexWrap="wrap">
              <Button
                flex={1}
                minWidth={140}
                bg={themeDef.brand}
                onPress={() => {
                  const trimmed = backgroundDraft.trim();
                  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
                    Alert.alert(t.title, t.backgroundInvalid);
                    return;
                  }
                  const next = normalizeAppBackgroundUri(trimmed || DEFAULT_APP_BACKGROUND_URI);
                  setAppBackgroundUri(next);
                  setBackgroundDraft(next);
                  Alert.alert(t.title, t.backgroundSaved, [{ text: 'OK' }]);
                }}
              >
                <ButtonText>{t.backgroundSave}</ButtonText>
              </Button>
              <Button
                flex={1}
                minWidth={140}
                variant="outline"
                onPress={() => {
                  setBackgroundDraft(DEFAULT_APP_BACKGROUND_URI);
                  setAppBackgroundUri(DEFAULT_APP_BACKGROUND_URI);
                  Alert.alert(t.title, t.backgroundSaved, [{ text: 'OK' }]);
                }}
              >
                <ButtonText>{t.backgroundReset}</ButtonText>
              </Button>
            </HStack>
          </VStack>

          {/* Language */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
              {t.language}
            </Text>
            <HStack space="sm" flexWrap="wrap">
              <Pressable
                flex={1}
                minWidth={120}
                bg={language === 'en' ? themeDef.brand : '$backgroundLight100'}
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
                bg={language === 'es' ? themeDef.brand : '$backgroundLight100'}
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
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
              {t.currency}
            </Text>
            <HStack space="sm" flexWrap="wrap">
              <Pressable
                flex={1}
                minWidth={120}
                bg={currency === 'USD' ? themeDef.brand : '$backgroundLight100'}
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
                bg={currency === 'MXN' ? themeDef.brand : '$backgroundLight100'}
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
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
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
                bg={themeDef.brand}
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

          {/* BizneAI: cafés (programa 10 = 1) — fuente https://bizneai.com/api/shop */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
              {t.bizneCafesTitle}
            </Text>
            <Text fontSize="$sm" color="$textLight600">
              {t.bizneCafesSubtitle}
            </Text>
            {language === 'es' ? (
              <Text fontSize="$xs" color="$textLight500">
                {t.bizneEsFlowHint}
              </Text>
            ) : null}
            {!process.env.EXPO_PUBLIC_BIZNEAI_CAFE_STATUS_POST_URL?.trim() ? (
              <Text fontSize="$xs" color="$textLight400">
                {t.biznePostHint}
              </Text>
            ) : null}
            {bizneLoading ? (
              <HStack space="sm" alignItems="center" py="$2">
                <Spinner size="small" color={themeDef.brand} />
                <Text fontSize="$sm" color="$textLight600">
                  {t.bizneLoading}
                </Text>
              </HStack>
            ) : bizneError ? (
              <VStack space="sm">
                <Text fontSize="$sm" color="#b91c1c">
                  {bizneError}
                </Text>
                <Button size="sm" bg={themeDef.brand} alignSelf="flex-start" onPress={loadBizneCafes}>
                  <ButtonText>{t.bizneRetry}</ButtonText>
                </Button>
              </VStack>
            ) : bizneCafes.length === 0 ? (
              <Text fontSize="$sm" color="$textLight500">
                {t.bizneEmpty}
              </Text>
            ) : (
              <HStack space="sm" flexWrap="wrap">
                {bizneCafes.map((shop) => {
                  const cid = bizneAiShopCanonicalId(shop);
                  const savedBizne = preferredMall?.id === cid && preferredMall?.source === 'bizneai';
                  const pendingEs = language === 'es' && biznePendingShopId === cid;
                  const highlightEn = language !== 'es' && savedBizne;
                  const highlight = pendingEs || highlightEn;
                  const label = shop.storeName ?? cid;
                  const sub =
                    [shop.storeLocation, shop.storeType].filter(Boolean).join(' · ') || shop.fullAddress || '';
                  return (
                    <Pressable
                      key={cid}
                      flex={1}
                      minWidth={160}
                      bg={highlight ? themeDef.brand : '$backgroundLight100'}
                      borderRadius="$lg"
                      p="$4"
                      borderWidth={language === 'es' && savedBizne && !pendingEs ? 2 : 0}
                      borderColor={themeDef.brand}
                      onPress={() => {
                        if (language === 'es') {
                          setBiznePendingShopId((prev) => (prev === cid ? null : cid));
                        } else {
                          handleSelectBizneCafe(shop);
                        }
                      }}
                    >
                      <Text
                        fontSize="$sm"
                        fontWeight="$semibold"
                        color={highlight ? '$white' : '$textLight700'}
                        numberOfLines={2}
                      >
                        {label}
                      </Text>
                      {sub ? (
                        <Text
                          fontSize="$xs"
                          color={highlight ? '$white' : '$textLight500'}
                          opacity={highlight ? 0.9 : 1}
                          mt="$1"
                          numberOfLines={2}
                        >
                          {sub}
                        </Text>
                      ) : null}
                      {language === 'es' && savedBizne ? (
                        <Text fontSize="$xs" color={highlight ? '$white' : '$textLight500'} mt="$1" opacity={0.95}>
                          ✓ Guardado
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </HStack>
            )}
            {language === 'es' && bizneCafes.length > 0 && !bizneLoading && !bizneError ? (
              <Button
                mt="$3"
                width="100%"
                bg={themeDef.brand}
                isDisabled={!biznePendingShopId}
                onPress={() => {
                  const shop = bizneCafes.find((s) => bizneAiShopCanonicalId(s) === biznePendingShopId);
                  if (!shop) {
                    Alert.alert(t.title, t.bizneSelectFirstHint);
                    return;
                  }
                  applyBiznePreferred(shop);
                  Alert.alert(t.title, t.bizneSavedPreferred, [{ text: 'OK' }]);
                }}
              >
                <ButtonText>{t.bizneSavePreferred}</ButtonText>
              </Button>
            ) : null}
          </VStack>

          {/* Preferred mall */}
          <VStack space="sm">
            <Text fontSize="$lg" fontWeight="$bold" color={settingsTitleColor}>
              {t.preferredMall}
            </Text>
            <Pressable
              flex={1}
              minWidth={120}
              bg={preferredMall == null ? themeDef.brand : '$backgroundLight100'}
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
                    bg={selected ? themeDef.brand : '$backgroundLight100'}
                    borderRadius="$lg"
                    p="$4"
                    onPress={() =>
                      handleSelectStore({
                        id: store.id,
                        name: store.name,
                        nameEs: store.nameEs,
                        source: 'nearby_mock',
                      })
                    }
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
