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
import { Modal, View, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import { useWalletDisclosure } from '../context/WalletDisclosureContext';
import {
  useWalletBalance,
  formatMoney,
  USD_TO_MXN,
  LUXAE_PRICE_USD,
} from '../context/WalletBalanceContext';
import WalletAddressSection from '../components/WalletAddressSection';
import AddressPayReceiveModal from '../components/AddressPayReceiveModal';
import {
  getWalletAddresses,
  addWalletAddress,
  isValidEvmAddress,
  isValidBtcAddress,
  isValidBchAddress,
  isValidXrpAddress,
  isValidSolanaAddress,
  getWalletLedger,
} from '../services/storage';
import type { WalletChain, WalletLedgerEntry } from '../services/storage';
import { getEthBalance } from '../services/ethRpc';
import { getBtcBalance } from '../services/btcRpc';
import { getBchBalance } from '../services/bchRpc';
import { getXrpBalance } from '../services/xrpRpc';
import { getSolBalance } from '../services/solanaRpc';
import { getMaticBalance } from '../services/polygonRpc';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import { formatAddressForUi } from '../utils/addressDisplay';
import { getWalletScreenStrings } from '../i18n/uiStrings';
import { useBrandTheme } from '../theme/useBrandTheme';

function formatCrypto(amount: number, decimals = 6): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(amount);
}

function ledgerKindBadgeColor(kind: WalletLedgerEntry['kind']): string {
  switch (kind) {
    case 'income':
      return '#166534';
    case 'payment':
      return '#9A3412';
    case 'redemption':
      return '#6B21A8';
    default:
      return '#1D4ED8';
  }
}

/** Enlaces genéricos a intercambio (servicios externos; no afiliación). */
const SWAP_URL_BY_COIN_ID: Record<string, string> = {
  luxae: 'https://quickswap.exchange/#/swap',
  ethereum: 'https://app.uniswap.org/',
  bitcoin: 'https://simpleswap.io/',
  'bitcoin-cash': 'https://simpleswap.io/',
  ripple: 'https://simpleswap.io/',
  solana: 'https://jup.ag/swap',
};

export default function WalletScreen() {
  const { language, currency } = useSettings();
  const { brand, brandBg, brandBorder } = useBrandTheme();
  const { revealWalletAddresses, refreshVerificationAccess } = useVerificationAccess();
  const { notifyWalletScreenFocused } = useWalletDisclosure();
  const {
    loading,
    error,
    refetch,
    pricesForCalculation,
    luxaeBalance,
    refreshLuxaeBalance,
    luxaeHydrated,
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
  const [bchAddress, setBchAddress] = useState<string | null>(null);
  const [bchBalance, setBchBalance] = useState(0);
  const [loadingBch, setLoadingBch] = useState(false);
  const [xrpAddress, setXrpAddress] = useState<string | null>(null);
  const [xrpBalance, setXrpBalance] = useState(0);
  const [loadingXrp, setLoadingXrp] = useState(false);
  const [solAddress, setSolAddress] = useState<string | null>(null);
  const [solBalance, setSolBalance] = useState(0);
  const [loadingSol, setLoadingSol] = useState(false);
  const [addAddressModal, setAddAddressModal] = useState<{
    visible: boolean;
    chain: WalletChain;
    input: string;
  }>({ visible: false, chain: 'ethereum', input: '' });

  const [payReceiveModal, setPayReceiveModal] = useState<{
    visible: boolean;
    address: string | null;
    chainLabel: string;
    initialIntent: 'pay' | 'receive';
  }>({ visible: false, address: null, chainLabel: '', initialIntent: 'pay' });

  const [ledgerEntries, setLedgerEntries] = useState<WalletLedgerEntry[]>([]);

  const loadWalletAndBalance = useCallback(async () => {
    const list = await getWalletAddresses();
    const ethItem = list.find((w) => (w.chain ?? 'ethereum') === 'ethereum') ?? list.find((w) => !w.chain);
    const polygonItem = list.find((w) => w.chain === 'polygon');
    const btcItem = list.find((w) => w.chain === 'bitcoin');
    const bchItem = list.find((w) => w.chain === 'bitcoin-cash');
    const xrpItem = list.find((w) => w.chain === 'ripple');
    const solItem = list.find((w) => w.chain === 'solana');
    setDefaultAddress(ethItem?.address ?? null);
    setPolygonAddress(polygonItem?.address ?? null);
    setBtcAddress(btcItem?.address ?? null);
    setBchAddress(bchItem?.address ?? null);
    setXrpAddress(xrpItem?.address ?? null);
    setSolAddress(solItem?.address ?? null);

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

    if (bchItem?.address) {
      setLoadingBch(true);
      try {
        setBchBalance(await getBchBalance(bchItem.address));
      } finally {
        setLoadingBch(false);
      }
    } else {
      setBchBalance(0);
    }

    if (xrpItem?.address) {
      setLoadingXrp(true);
      try {
        setXrpBalance(await getXrpBalance(xrpItem.address));
      } finally {
        setLoadingXrp(false);
      }
    } else {
      setXrpBalance(0);
    }

    if (solItem?.address) {
      setLoadingSol(true);
      try {
        setSolBalance(await getSolBalance(solItem.address));
      } finally {
        setLoadingSol(false);
      }
    } else {
      setSolBalance(0);
    }
  }, []);

  const loadLedger = useCallback(async () => {
    setLedgerEntries(await getWalletLedger());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshVerificationAccess();
      notifyWalletScreenFocused();
      refreshLuxaeBalance().catch(() => {});
      loadWalletAndBalance();
      loadLedger();
    }, [
      loadWalletAndBalance,
      loadLedger,
      notifyWalletScreenFocused,
      refreshVerificationAccess,
      refreshLuxaeBalance,
    ])
  );

  const t = useMemo(() => getWalletScreenStrings(language, currency), [language, currency]);

  const luxaeQrAddress = defaultAddress ?? polygonAddress;

  const handleOpenSwap = useCallback(
    (coinId: string) => {
      const url = SWAP_URL_BY_COIN_ID[coinId];
      if (!url) {
        Alert.alert(t.swapCta, t.swapUnavailable);
        return;
      }
      Alert.alert(t.swapCta, t.swapExternalHint, [
        { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: language === 'es' ? 'Abrir' : 'Open',
          onPress: () => {
            Linking.openURL(url).catch(() => {
              Alert.alert(t.swapCta, t.swapUnavailable);
            });
          },
        },
      ]);
    },
    [language, t]
  );

  const ethPriceUsd = pricesForCalculation.ethereum?.usd ?? 0;
  const maticPriceUsd = pricesForCalculation['matic-network']?.usd ?? 0;
  const btcPriceUsd = pricesForCalculation.bitcoin?.usd ?? 0;
  const bchPriceUsd = pricesForCalculation['bitcoin-cash']?.usd ?? 0;
  const xrpPriceUsd = pricesForCalculation.ripple?.usd ?? 0;
  const solPriceUsd = pricesForCalculation.solana?.usd ?? 0;
  const walletTotalUsd =
    luxaeBalance * LUXAE_PRICE_USD +
    metamaskEthBalance * ethPriceUsd +
    polygonMaticBalance * maticPriceUsd +
    btcBalance * btcPriceUsd +
    bchBalance * bchPriceUsd +
    xrpBalance * xrpPriceUsd +
    solBalance * solPriceUsd;
  const walletTotalDisplay = currency === 'MXN' ? walletTotalUsd * USD_TO_MXN : walletTotalUsd;
  const formattedWalletTotal = formatMoney(walletTotalDisplay, currency);

  const handleAddAddress = useCallback(async () => {
    const { chain, input } = addAddressModal;
    const trimmed = input.trim();
    const valid = (() => {
      switch (chain) {
        case 'bitcoin':
          return isValidBtcAddress(trimmed);
        case 'bitcoin-cash':
          return isValidBchAddress(trimmed);
        case 'ripple':
          return isValidXrpAddress(trimmed);
        case 'solana':
          return isValidSolanaAddress(trimmed);
        case 'ethereum':
        case 'polygon':
        default:
          return isValidEvmAddress(trimmed);
      }
    })();
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
        id: 'bitcoin' as const,
        name: 'Bitcoin',
        symbol: 'BTC',
        balance: btcBalance,
        priceUsd: btcPriceUsd,
        subtitle: btcAddress ? t.metamaskBalance : undefined,
        canAddAddress: true,
        chain: 'bitcoin' as WalletChain,
      },
      {
        id: 'bitcoin-cash' as const,
        name: 'Bitcoin Cash',
        symbol: 'BCH',
        balance: bchBalance,
        priceUsd: bchPriceUsd,
        subtitle: bchAddress ? t.metamaskBalance : undefined,
        canAddAddress: true,
        chain: 'bitcoin-cash' as WalletChain,
      },
      {
        id: 'ripple' as const,
        name: 'XRP',
        symbol: 'XRP',
        balance: xrpBalance,
        priceUsd: xrpPriceUsd,
        subtitle: xrpAddress ? t.metamaskBalance : undefined,
        canAddAddress: true,
        chain: 'ripple' as WalletChain,
      },
      {
        id: 'solana' as const,
        name: 'Solana',
        symbol: 'SOL',
        balance: solBalance,
        priceUsd: solPriceUsd,
        subtitle: solAddress ? t.metamaskBalance : undefined,
        canAddAddress: true,
        chain: 'solana' as WalletChain,
      },
    ],
    [
      luxaeBalance,
      metamaskEthBalance,
      btcBalance,
      bchBalance,
      xrpBalance,
      solBalance,
      ethPriceUsd,
      btcPriceUsd,
      bchPriceUsd,
      xrpPriceUsd,
      solPriceUsd,
      defaultAddress,
      btcAddress,
      bchAddress,
      xrpAddress,
      solAddress,
      t.luxaeStablecoin,
      t.metamaskBalance,
      language,
    ]
  );

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <VStack space="lg">
          {/* Total - same source as index (WalletBalanceContext) */}
          <Box bg={brand} borderRadius="$xl" p="$5">
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

          {/* Saldos: LUXAE + ETH + BTC + BCH + XRP + SOL. MATIC nativo se sigue sumando al total arriba sin tarjeta propia. */}
          {!loading && (
            <VStack space="md">
              <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
                {t.balance}
              </Text>
              {!revealWalletAddresses ? (
                <Text fontSize="$xs" color="$textLight500" mb="$1">
                  {t.addressMaskedHint}
                </Text>
              ) : null}
              {coins.map((coin) => {
                const valueUsd = coin.balance * coin.priceUsd;
                const valueDisplay = currency === 'MXN' ? valueUsd * USD_TO_MXN : valueUsd;
                const priceDisplay = currency === 'MXN' ? coin.priceUsd * USD_TO_MXN : coin.priceUsd;
                const isLoadingCoin =
                  (coin.id === 'ethereum' && loadingEth) ||
                  (coin.id === 'bitcoin' && loadingBtc) ||
                  (coin.id === 'bitcoin-cash' && loadingBch) ||
                  (coin.id === 'ripple' && loadingXrp) ||
                  (coin.id === 'solana' && loadingSol);
                const canAdd = 'canAddAddress' in coin && coin.canAddAddress;
                const chain = 'chain' in coin ? coin.chain : null;
                const luxaePending = coin.id === 'luxae' && !luxaeHydrated;
                const coinAddress =
                  coin.id === 'luxae'
                    ? luxaeQrAddress
                    : coin.id === 'ethereum'
                      ? defaultAddress
                      : coin.id === 'bitcoin'
                        ? btcAddress
                        : coin.id === 'bitcoin-cash'
                          ? bchAddress
                          : coin.id === 'ripple'
                            ? xrpAddress
                            : coin.id === 'solana'
                              ? solAddress
                              : null;
                return (
                  <Box
                    key={coin.id}
                    bg="$backgroundLight50"
                    borderRadius="$lg"
                    p="$4"
                    borderLeftWidth={4}
                    borderLeftColor={brand}
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
                        {coinAddress ? (
                          <Text fontSize="$xs" color="$textLight600" numberOfLines={1}>
                            {formatAddressForUi(coinAddress, revealWalletAddresses)}
                          </Text>
                        ) : null}
                        <Text fontSize="$sm" color="$textLight600">
                          {coin.symbol}{' '}
                          {luxaePending || isLoadingCoin ? '…' : formatCrypto(coin.balance)}
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
                            <Text fontSize="$xs" color={brand} fontWeight="$medium">
                              + {t.addAddress}
                            </Text>
                          </Pressable>
                        )}
                        {coinAddress ? (
                          <Pressable
                            mt="$2"
                            alignSelf="flex-start"
                            onPress={() =>
                              setPayReceiveModal({
                                visible: true,
                                address: coinAddress,
                                chainLabel: coin.name,
                                initialIntent: 'pay',
                              })
                            }
                          >
                            <Text fontSize="$xs" color={brand} fontWeight="$medium">
                              {t.payReceiveQr}
                            </Text>
                          </Pressable>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          mt="$2"
                          alignSelf="stretch"
                          borderColor={brand}
                          onPress={() => handleOpenSwap(coin.id)}
                        >
                          <ButtonText color={brand}>{t.swapCta}</ButtonText>
                        </Button>
                      </VStack>
                      <VStack space="xs" alignItems="flex-end">
                        <Text fontSize="$md" fontWeight="$semibold" color={brand}>
                          {t.valueLabel}:{' '}
                          {luxaePending || isLoadingCoin ? '…' : formatMoney(valueDisplay, currency)}
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

          {/* Historial LUXAE (ingresos, pagos, redenciones, fidelidad) */}
          <VStack space="sm">
            <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
              {t.ledgerSectionTitle}
            </Text>
            <Text fontSize="$xs" color="$textLight500" mb="$1">
              {t.ledgerSectionHint}
            </Text>
            {ledgerEntries.length === 0 ? (
              <Box bg="$backgroundLight100" borderRadius="$lg" p="$6" alignItems="center">
                <Text fontSize="$sm" color="$textLight500">
                  {t.empty}
                </Text>
              </Box>
            ) : (
              <VStack space="sm">
                {ledgerEntries.map((row) => {
                  const title = language === 'es' ? row.titleEs : row.titleEn;
                  const kindLabel =
                    row.kind === 'income'
                      ? t.ledgerKindIncome
                      : row.kind === 'payment'
                        ? t.ledgerKindPayment
                        : row.kind === 'redemption'
                          ? t.ledgerKindRedemption
                          : t.ledgerKindLoyalty;
                  const when = new Date(row.createdAt).toLocaleString(
                    language === 'es' ? 'es-MX' : 'en-US',
                    { dateStyle: 'short', timeStyle: 'short' }
                  );
                  const amt =
                    row.amountLuxae === 0
                      ? '—'
                      : `${row.amountLuxae > 0 ? '+' : '−'}${formatCrypto(Math.abs(row.amountLuxae), 4)} ${TOKEN_SYMBOL}`;
                  return (
                    <Box
                      key={row.id}
                      bg="$backgroundLight50"
                      borderRadius="$lg"
                      p="$3"
                      borderLeftWidth={4}
                      borderLeftColor={ledgerKindBadgeColor(row.kind)}
                    >
                      <HStack justifyContent="space-between" alignItems="flex-start" flexWrap="wrap">
                        <VStack space="xs" flex={1} maxWidth="72%">
                          <HStack space="xs" alignItems="center" flexWrap="wrap">
                            <Text fontSize="$2xs" fontWeight="$bold" color={brand}>
                              {kindLabel}
                            </Text>
                            <Text fontSize="$2xs" color="$textLight500">
                              {when}
                            </Text>
                          </HStack>
                          <Text fontSize="$sm" fontWeight="$semibold" color="$textLight900">
                            {title}
                          </Text>
                          {row.details ? (
                            <Text fontSize="$xs" color="$textLight600" selectable>
                              {row.details}
                            </Text>
                          ) : null}
                        </VStack>
                        <Text fontSize="$sm" fontWeight="$bold" color="$textLight800">
                          {amt}
                        </Text>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </VStack>
        </VStack>
      </ScrollView>

      {/* Modal: añadir dirección manual (EVM, BTC, BCH, XRP, SOL) */}
      <Modal
        visible={addAddressModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddAddressModal((p) => ({ ...p, visible: false }))}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <Box bg="$white" borderRadius="$xl" p="$5">
            <Text fontSize="$lg" fontWeight="$bold" color={brand} mb="$3">
              {addAddressModal.chain === 'bitcoin'
                ? t.addAddressBtc
                : addAddressModal.chain === 'bitcoin-cash'
                  ? t.addAddressBch
                  : addAddressModal.chain === 'ripple'
                    ? t.addAddressXrp
                    : addAddressModal.chain === 'solana'
                      ? t.addAddressSol
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
              <Button size="sm" bg={brand} onPress={handleAddAddress}>
                <ButtonText>{t.addAddress}</ButtonText>
              </Button>
            </HStack>
          </Box>
        </View>
      </Modal>

      <AddressPayReceiveModal
        visible={payReceiveModal.visible}
        onClose={() => setPayReceiveModal((p) => ({ ...p, visible: false }))}
        addressOverride={payReceiveModal.address}
        chainLabel={payReceiveModal.chainLabel}
        initialIntent={payReceiveModal.initialIntent}
      />
    </Box>
  );
}
