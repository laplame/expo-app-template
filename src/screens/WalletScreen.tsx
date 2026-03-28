import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Text,
  ScrollView,
  VStack,
  HStack,
  Spinner,
  Button,
  ButtonText,
  Input,
  InputField,
  Pressable,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Modal, View, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { useWalletDisclosure } from '../context/WalletDisclosureContext';
import {
  useWalletBalance,
  formatMoney,
  USD_TO_MXN,
  LUXAE_PRICE_USD,
} from '../context/WalletBalanceContext';
import WalletAddressSection from '../components/WalletAddressSection';
import {
  getWalletAddresses,
  addWalletAddress,
  isValidEvmAddress,
  isValidBtcAddress,
} from '../services/storage';
import type { WalletChain } from '../services/storage';
import { getEthBalance } from '../services/ethRpc';
import { getBtcBalance } from '../services/btcRpc';
import { getMaticBalance } from '../services/polygonRpc';
import { ERC20_TOKEN_NAME, TOKEN_SYMBOL } from '../constants/luxToken';

function formatCrypto(amount: number, decimals = 6): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
}

// Translations: EN/ES × USD/MXN so UI updates when selectors change
function getTranslations(language: 'en' | 'es', currency: 'USD' | 'MXN') {
  if (language === 'es') {
    return {
      title: 'Billetera',
      totalLabel: currency === 'MXN' ? 'Total en MXN (pesos)' : 'Total en USD (dólares)',
      balance: 'Saldo disponible',
      recent: 'Actividad reciente',
      empty: 'No hay transacciones recientes.',
      error: 'Error al cargar precios. Reintentar.',
      retry: 'Reintentar',
      loading: 'Cargando precios...',
      valueLabel: currency === 'MXN' ? 'Valor (MXN)' : 'Valor (USD)',
      priceLabel: currency === 'MXN' ? 'Precio (MXN)' : 'Precio (USD)',
      currencyName: currency === 'MXN' ? 'pesos mexicanos' : 'dólares',
      luxaeStablecoin: `Token ${TOKEN_SYMBOL} · ERC-20 ${ERC20_TOKEN_NAME} · 1 USD`,
      metamaskBalance: 'Saldo en la red',
      polygonBalance: 'Saldo Polygon (MATIC)',
      addAddress: 'Añadir dirección',
      addAddressManual: 'Añadir dirección manual',
      addAddressEth: 'Añadir dirección ETH (Ethereum)',
      addAddressPolygon: 'Añadir dirección Polygon (MATIC)',
      addAddressBtc: 'Añadir dirección BTC (Bitcoin)',
      addressPlaceholder: '0x... o bc1...',
      invalidAddress: 'Dirección no válida.',
      added: 'Dirección añadida.',
    };
  }
  return {
    title: 'Wallet',
    totalLabel: currency === 'MXN' ? 'Total in MXN (pesos)' : 'Total in USD (dollars)',
    balance: 'Available balance',
    recent: 'Recent activity',
    empty: 'No recent transactions.',
    error: 'Error loading prices. Retry.',
    retry: 'Retry',
    loading: 'Loading prices...',
    valueLabel: currency === 'MXN' ? 'Value (MXN)' : 'Value (USD)',
    priceLabel: currency === 'MXN' ? 'Price (MXN)' : 'Price (USD)',
    currencyName: currency === 'MXN' ? 'Mexican pesos' : 'dollars',
    luxaeStablecoin: `Token ${TOKEN_SYMBOL} · ERC-20 ${ERC20_TOKEN_NAME} · 1 USD`,
    metamaskBalance: 'Balance on network',
    polygonBalance: 'Polygon (MATIC) balance',
    addAddress: 'Add address',
    addAddressManual: 'Add address manually',
    addAddressEth: 'Add ETH (Ethereum) address',
    addAddressPolygon: 'Add Polygon (MATIC) address',
    addAddressBtc: 'Add BTC (Bitcoin) address',
    addressPlaceholder: '0x... or bc1...',
    invalidAddress: 'Invalid address.',
    added: 'Address added.',
  };
}

export default function WalletScreen() {
  const { language, currency } = useSettings();
  const { notifyWalletScreenFocused } = useWalletDisclosure();
  const {
    loading,
    error,
    refetch,
    pricesForCalculation,
    luxaeBalance,
  } = useWalletBalance();

  const [defaultAddress, setDefaultAddress] = useState<string | null>(null);
  const [metamaskEthBalance, setMetamaskEthBalance] = useState(0);
  const [loadingEth, setLoadingEth] = useState(false);
  const [polygonAddress, setPolygonAddress] = useState<string | null>(null);
  const [polygonMaticBalance, setPolygonMaticBalance] = useState(0);
  const [loadingMatic, setLoadingMatic] = useState(false);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [btcBalance, setBtcBalance] = useState(0);
  const [loadingBtc, setLoadingBtc] = useState(false);
  const [addAddressModal, setAddAddressModal] = useState<{
    visible: boolean;
    chain: WalletChain;
    input: string;
  }>({ visible: false, chain: 'ethereum', input: '' });

  const loadWalletAndBalance = useCallback(async () => {
    const list = await getWalletAddresses();
    const ethItem = list.find((w) => (w.chain ?? 'ethereum') === 'ethereum') ?? list.find((w) => !w.chain);
    const polygonItem = list.find((w) => w.chain === 'polygon');
    const btcItem = list.find((w) => w.chain === 'bitcoin');
    setDefaultAddress(ethItem?.address ?? null);
    setPolygonAddress(polygonItem?.address ?? null);
    setBtcAddress(btcItem?.address ?? null);

    if (ethItem?.address) {
      setLoadingEth(true);
      try {
        const eth = await getEthBalance(ethItem.address);
        setMetamaskEthBalance(eth);
      } finally {
        setLoadingEth(false);
      }
    } else {
      setMetamaskEthBalance(0);
    }

    if (polygonItem?.address) {
      setLoadingMatic(true);
      try {
        const matic = await getMaticBalance(polygonItem.address);
        setPolygonMaticBalance(matic);
      } finally {
        setLoadingMatic(false);
      }
    } else {
      setPolygonMaticBalance(0);
    }

    if (btcItem?.address) {
      setLoadingBtc(true);
      try {
        const btc = await getBtcBalance(btcItem.address);
        setBtcBalance(btc);
      } finally {
        setLoadingBtc(false);
      }
    } else {
      setBtcBalance(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      notifyWalletScreenFocused();
      loadWalletAndBalance();
    }, [loadWalletAndBalance, notifyWalletScreenFocused])
  );

  const t = useMemo(() => getTranslations(language, currency), [language, currency]);

  const ethPriceUsd = pricesForCalculation.ethereum?.usd ?? 0;
  const maticPriceUsd = pricesForCalculation['matic-network']?.usd ?? 0;
  const btcPriceUsd = pricesForCalculation.bitcoin?.usd ?? 0;
  const walletTotalUsd =
    luxaeBalance * LUXAE_PRICE_USD +
    metamaskEthBalance * ethPriceUsd +
    polygonMaticBalance * maticPriceUsd +
    btcBalance * btcPriceUsd;
  const walletTotalDisplay = currency === 'MXN' ? walletTotalUsd * USD_TO_MXN : walletTotalUsd;
  const formattedWalletTotal = formatMoney(walletTotalDisplay, currency);

  const handleAddAddress = useCallback(async () => {
    const { chain, input } = addAddressModal;
    const trimmed = input.trim();
    const valid =
      chain === 'bitcoin' ? isValidBtcAddress(trimmed) : isValidEvmAddress(trimmed);
    if (!valid) {
      Alert.alert(t.addAddress, t.invalidAddress);
      return;
    }
    const added = await addWalletAddress(trimmed, 'manual', undefined, chain);
    if (added) {
      setAddAddressModal((p) => ({ ...p, visible: false, input: '' }));
      await loadWalletAndBalance();
      Alert.alert(t.addAddress, t.added);
    } else {
      Alert.alert(t.addAddress, language === 'es' ? 'La dirección ya está añadida.' : 'Address already added.');
    }
  }, [addAddressModal, loadWalletAndBalance, t, language]);

  const coins = useMemo(
    () => [
      {
        id: 'luxae' as const,
        name: TOKEN_SYMBOL,
        symbol: TOKEN_SYMBOL,
        balance: luxaeBalance,
        priceUsd: LUXAE_PRICE_USD,
        subtitle: t.luxaeStablecoin,
        canAddAddress: false,
      },
      {
        id: 'ethereum' as const,
        name: 'Ethereum',
        symbol: 'ETH',
        balance: metamaskEthBalance,
        priceUsd: ethPriceUsd,
        subtitle: defaultAddress ? t.metamaskBalance : undefined,
        canAddAddress: true,
        chain: 'ethereum' as WalletChain,
      },
      {
        id: 'polygon' as const,
        name: 'Polygon',
        symbol: 'MATIC',
        balance: polygonMaticBalance,
        priceUsd: maticPriceUsd,
        subtitle: polygonAddress ? t.polygonBalance : undefined,
        canAddAddress: true,
        chain: 'polygon' as WalletChain,
      },
      {
        id: 'bitcoin' as const,
        name: 'Bitcoin',
        symbol: 'BTC',
        balance: btcBalance,
        priceUsd: btcPriceUsd,
        subtitle: btcAddress ? t.metamaskBalance : undefined,
        canAddAddress: true,
        chain: 'bitcoin' as WalletChain,
      },
    ],
    [
      luxaeBalance,
      metamaskEthBalance,
      polygonMaticBalance,
      btcBalance,
      ethPriceUsd,
      maticPriceUsd,
      btcPriceUsd,
      defaultAddress,
      polygonAddress,
      btcAddress,
      t.luxaeStablecoin,
      t.metamaskBalance,
      t.polygonBalance,
    ]
  );

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <VStack space="lg">
          {/* Total - same source as index (WalletBalanceContext) */}
          <Box bg="#00704A" borderRadius="$xl" p="$5">
            <Text fontSize="$lg" color="$white" opacity={0.9}>
              {t.totalLabel}
            </Text>
            {loading ? (
              <HStack alignItems="center" mt="$2" space="sm">
                <Spinner size="small" color="$white" />
                <Text fontSize="$md" color="$white">
                  {t.loading}
                </Text>
              </HStack>
            ) : error ? (
              <VStack mt="$2" space="sm">
                <Text fontSize="$lg" color="$white">
                  {formattedWalletTotal}
                </Text>
                <Text fontSize="$sm" color="$white" opacity={0.9}>
                  {error || t.error}
                </Text>
                <Button size="sm" variant="outline" alignSelf="flex-start" onPress={refetch}>
                  <ButtonText color="$white">{t.retry}</ButtonText>
                </Button>
              </VStack>
            ) : (
              <Text fontSize="$3xl" fontWeight="$bold" color="$white" mt="$2">
                {formattedWalletTotal}
              </Text>
            )}
          </Box>

          {/* Saldos: token LUXAE (ERC-20 LXD) + ETH (MetaMask al conectar). Empiezan en 0. */}
          {!loading && (
            <VStack space="md">
              <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
                {t.balance}
              </Text>
              {coins.map((coin) => {
                const valueUsd = coin.balance * coin.priceUsd;
                const valueDisplay = currency === 'MXN' ? valueUsd * USD_TO_MXN : valueUsd;
                const priceDisplay = currency === 'MXN' ? coin.priceUsd * USD_TO_MXN : coin.priceUsd;
                const isLoadingCoin =
                  (coin.id === 'ethereum' && loadingEth) ||
                  (coin.id === 'polygon' && loadingMatic) ||
                  (coin.id === 'bitcoin' && loadingBtc);
                const canAdd = 'canAddAddress' in coin && coin.canAddAddress;
                const chain = 'chain' in coin ? coin.chain : null;
                return (
                  <Box
                    key={coin.id}
                    bg="$backgroundLight50"
                    borderRadius="$lg"
                    p="$4"
                    borderLeftWidth={4}
                    borderLeftColor="#00704A"
                  >
                    <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
                      <VStack space="xs" flex={1}>
                        <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
                          {coin.name} ({coin.symbol})
                        </Text>
                        {'subtitle' in coin && coin.subtitle ? (
                          <Text fontSize="$xs" color="$textLight500">
                            {coin.subtitle}
                          </Text>
                        ) : null}
                        <Text fontSize="$sm" color="$textLight600">
                          {coin.symbol} {isLoadingCoin ? '…' : formatCrypto(coin.balance)}
                        </Text>
                        {canAdd && chain && (
                          <Pressable
                            mt="$2"
                            alignSelf="flex-start"
                            onPress={() =>
                              setAddAddressModal({
                                visible: true,
                                chain,
                                input: '',
                              })
                            }
                          >
                            <Text fontSize="$xs" color="#00704A" fontWeight="$medium">
                              + {t.addAddress}
                            </Text>
                          </Pressable>
                        )}
                      </VStack>
                      <VStack space="xs" alignItems="flex-end">
                        <Text fontSize="$md" fontWeight="$semibold" color="#00704A">
                          {t.valueLabel}: {isLoadingCoin ? '…' : formatMoney(valueDisplay, currency)}
                        </Text>
                        <Text fontSize="$xs" color="$textLight500">
                          {t.priceLabel}: {formatMoney(priceDisplay, currency)} / {coin.symbol}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          )}

          {/* Wallet addresses (MetaMask + manual); al conectar recargamos saldo ETH */}
          <WalletAddressSection language={language} onAddressesChange={loadWalletAndBalance} />

          {/* Recent activity */}
          <VStack space="sm">
            <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
              {t.recent}
            </Text>
            <Box bg="$backgroundLight100" borderRadius="$lg" p="$6" alignItems="center">
              <Text fontSize="$sm" color="$textLight500">
                {t.empty}
              </Text>
            </Box>
          </VStack>
        </VStack>
      </ScrollView>

      {/* Modal: añadir dirección manual (ETH o BTC) */}
      <Modal
        visible={addAddressModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddAddressModal((p) => ({ ...p, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <Box bg="$white" borderRadius="$xl" p="$5">
            <Text fontSize="$lg" fontWeight="$bold" color="#00704A" mb="$3">
              {addAddressModal.chain === 'bitcoin'
                ? t.addAddressBtc
                : addAddressModal.chain === 'polygon'
                  ? t.addAddressPolygon
                  : t.addAddressEth}
            </Text>
            <Input size="md" mb="$4" borderRadius="$lg">
              <InputField
                placeholder={t.addressPlaceholder}
                value={addAddressModal.input}
                onChangeText={(text) =>
                  setAddAddressModal((p) => ({ ...p, input: text }))
                }
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Input>
            <HStack space="md" justifyContent="flex-end">
              <Button
                size="sm"
                variant="outline"
                onPress={() => setAddAddressModal((p) => ({ ...p, visible: false, input: '' }))}
              >
                <ButtonText>{language === 'es' ? 'Cancelar' : 'Cancel'}</ButtonText>
              </Button>
              <Button size="sm" bg="#00704A" onPress={handleAddAddress}>
                <ButtonText>{t.addAddress}</ButtonText>
              </Button>
            </HStack>
          </Box>
        </View>
      </Modal>
    </Box>
  );
}
