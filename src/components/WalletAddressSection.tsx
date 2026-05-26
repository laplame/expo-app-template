import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
  Input,
  InputField,
  Pressable,
} from '@gluestack-ui/themed';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSDK } from '@metamask/sdk-react-native';
import {
  getWalletAddresses,
  addWalletAddress,
  removeWalletAddress,
  setDefaultWalletAddress,
  isValidEvmAddress,
  type WalletAddressItem,
  type WalletChain,
} from '../services/storage';
import {
  createLink4DealPolygonWallet,
  deleteStoredPolygonPrivateKey,
} from '../services/link4dealWallet';
import { ERC20_TOKEN_NAME, TOKEN_SYMBOL } from '../constants/luxToken';
import {
  GENERATE_LUX_TOKEN_POLYGON_CONFIRM,
  formatBilingualAlertMessage,
  formatBilingualAlertTitle,
} from '../context/walletDisclosureCopy';
import { useMetaMaskUnavailable } from '../context/MetaMaskUnavailableContext';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import { formatAddressForUi } from '../utils/addressDisplay';
import { useBrandTheme } from '../theme/useBrandTheme';

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface WalletAddressSectionProps {
  language: 'en' | 'es';
  onAddressesChange?: (addresses: WalletAddressItem[]) => void;
}

/** Cadena usada al guardar 0x desde esta pantalla; la UI no nombra la red. */
const DEFAULT_EVM_IMPORT_CHAIN: WalletChain = 'polygon';

const translations = (language: 'en' | 'es') => ({
  sectionTitle: language === 'es' ? 'Mis direcciones' : 'My addresses',
  connectMetaMask: language === 'es' ? 'Conectar con MetaMask' : 'Connect with MetaMask',
  importClipboard: language === 'es' ? 'Importar desde portapapeles' : 'Import from clipboard',
  importNetworkHint:
    language === 'es'
      ? 'Para el saldo en la app, copia la dirección 0x desde MetaMask.'
      : 'For in-app balance, copy the 0x address from MetaMask.',
  generateLink4Deal:
    language === 'es'
      ? `Generar dirección ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME})`
      : `Generate ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}) address`,
  addManual: language === 'es' ? 'Añadir dirección manual' : 'Add address manually',
  addButton: language === 'es' ? 'Añadir' : 'Add',
  placeholder: language === 'es' ? '0x...' : '0x...',
  defaultLabel: language === 'es' ? 'Por defecto' : 'Default',
  setDefault: language === 'es' ? 'Usar por defecto' : 'Set as default',
  remove: language === 'es' ? 'Eliminar' : 'Remove',
  invalidAddress: language === 'es' ? 'Dirección EVM inválida (0x + 40 caracteres hex).' : 'Invalid EVM address (0x + 40 hex chars).',
  alreadyAdded: language === 'es' ? 'Ya está guardada.' : 'Already saved.',
  confirmRemoveTitle: language === 'es' ? '¿Eliminar dirección?' : 'Remove address?',
  confirmRemoveMessage:
    language === 'es'
      ? 'Si quitas esta dirección de la app, puedes perder la visibilidad de fondos asociados y no podrás pagar ni cobrar con ella desde aquí. Asegúrate de tener respaldo de tus claves. ¿Deseas continuar?'
      : 'Removing this address from the app may make associated funds harder to track here, and you will not be able to pay or receive with it from the app. Ensure you have backed up your keys. Continue?',
  ok: language === 'es' ? 'Aceptar' : 'OK',
  cancel: language === 'es' ? 'Cancelar' : 'Cancel',
  noAddresses: language === 'es' ? 'Aún no hay direcciones. Añade una manualmente.' : 'No addresses yet. Add one manually.',
  connecting: language === 'es' ? 'Conectando...' : 'Connecting...',
  notAvailable: language === 'es' ? 'MetaMask no disponible en este entorno.' : 'MetaMask not available in this environment.',
  couldNotConnect: language === 'es' ? 'No se pudo conectar.' : 'Could not connect.',
  emptyClipboard:
    language === 'es'
      ? 'El portapapeles no contiene una dirección 0x válida.'
      : 'Clipboard does not contain a valid 0x address.',
  generating: language === 'es' ? 'Generando...' : 'Generating...',
  link4dealError: language === 'es' ? 'No se pudo crear la billetera.' : 'Could not create wallet.',
  pasteReading: language === 'es' ? 'Leyendo...' : 'Reading...',
});

type EvmExtrasProps = {
  language: 'en' | 'es';
  brand: string;
  onPasteImport: () => void;
  onGenerateLink4Deal: () => void;
  pasteImporting: boolean;
  generating: boolean;
};

function WalletEvmImportBlock({
  language,
  brand,
  onPasteImport,
  onGenerateLink4Deal,
  pasteImporting,
  generating,
}: EvmExtrasProps) {
  const t = translations(language);
  return (
    <VStack space="sm" mb="$2">
      <Text fontSize="$sm" color="$textLight600">
        {t.importNetworkHint}
      </Text>
      <Button
        size="sm"
        variant="outline"
        borderColor={brand}
        onPress={onPasteImport}
        isDisabled={pasteImporting || generating}
      >
        <ButtonText color={brand}>
          {pasteImporting ? t.pasteReading : t.importClipboard}
        </ButtonText>
      </Button>
      <Button
        size="sm"
        variant="outline"
        borderColor={brand}
        onPress={onGenerateLink4Deal}
        isDisabled={generating || pasteImporting}
      >
        <ButtonText color={brand}>
          {generating ? t.generating : t.generateLink4Deal}
        </ButtonText>
      </Button>
    </VStack>
  );
}

/** Solo direcciones manuales: sin MetaMask, sin useSDK. Usado cuando el SDK falla (p. ej. Expo Go). */
function WalletAddressSectionManualOnly({
  language,
  onAddressesChange,
}: WalletAddressSectionProps) {
  const { brand } = useBrandTheme();
  const { revealWalletAddresses } = useVerificationAccess();
  const [addresses, setAddresses] = useState<WalletAddressItem[]>([]);
  const [manualAddress, setManualAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pasteImporting, setPasteImporting] = useState(false);
  const t = translations(language);

  const loadAddresses = useCallback(async () => {
    const list = await getWalletAddresses();
    setAddresses(list);
    onAddressesChange?.(list);
  }, [onAddressesChange]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handlePasteImport = useCallback(async () => {
    setPasteImporting(true);
    try {
      const text = await Clipboard.getStringAsync();
      const trimmed = (text || '').trim();
      if (!isValidEvmAddress(trimmed)) {
        Alert.alert(t.importClipboard, t.emptyClipboard);
        return;
      }
      const label = language === 'es' ? 'Importado (MetaMask)' : 'Imported (MetaMask)';
      const added = await addWalletAddress(trimmed, 'manual', label, DEFAULT_EVM_IMPORT_CHAIN);
      if (added) {
        await loadAddresses();
      } else {
        Alert.alert(t.importClipboard, t.alreadyAdded);
      }
    } finally {
      setPasteImporting(false);
    }
  }, [t, language, loadAddresses]);

  const runGeneratePolygonWallet = useCallback(async () => {
    setGenerating(true);
    try {
      await createLink4DealPolygonWallet();
      await loadAddresses();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'DUPLICATE_OR_INVALID') {
        Alert.alert(t.generateLink4Deal, t.alreadyAdded);
      } else {
        Alert.alert(t.generateLink4Deal, t.link4dealError);
      }
    } finally {
      setGenerating(false);
    }
  }, [t, loadAddresses]);

  const handleGenerateLink4Deal = useCallback(() => {
    Alert.alert(
      formatBilingualAlertTitle(
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.titleEs,
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.titleEn
      ),
      formatBilingualAlertMessage(
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.messageEs,
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.messageEn
      ),
      [
        {
          text:
            language === 'es'
              ? GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonCancelEs
              : GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonCancelEn,
          style: 'cancel',
        },
        {
          text:
            language === 'es'
              ? GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonGenerateEs
              : GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonGenerateEn,
          onPress: () => void runGeneratePolygonWallet(),
        },
      ]
    );
  }, [language, runGeneratePolygonWallet]);

  const handleAddManual = useCallback(async () => {
    const trimmed = manualAddress.trim();
    if (!isValidEvmAddress(trimmed)) {
      Alert.alert(t.addManual, t.invalidAddress);
      return;
    }
    setAdding(true);
    try {
      const added = await addWalletAddress(trimmed, 'manual', undefined, DEFAULT_EVM_IMPORT_CHAIN);
      if (added) {
        setManualAddress('');
        await loadAddresses();
      } else {
        Alert.alert(t.addManual, t.alreadyAdded);
      }
    } finally {
      setAdding(false);
    }
  }, [manualAddress, t, loadAddresses]);

  const handleSetDefault = useCallback(
    async (id: string) => {
      await setDefaultWalletAddress(id);
      await loadAddresses();
    },
    [loadAddresses]
  );

  const handleRemove = useCallback(
    (item: WalletAddressItem) => {
      Alert.alert(t.confirmRemoveTitle, t.confirmRemoveMessage, [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.remove,
          style: 'destructive',
          onPress: async () => {
            if (item.source === 'link4deal') {
              await deleteStoredPolygonPrivateKey(item.id);
            }
            await removeWalletAddress(item.id);
            await loadAddresses();
          },
        },
      ]);
    },
    [t, loadAddresses]
  );

  const noAddressesManual =
    language === 'es'
      ? `Aún no hay direcciones. Importa desde MetaMask, genera ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}) o escribe 0x.`
      : `No addresses yet. Import from MetaMask, generate ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}), or type 0x.`;

  return (
    <VStack space="md">
      <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
        {t.sectionTitle}
      </Text>
      <WalletEvmImportBlock
        language={language}
        brand={brand}
        onPasteImport={handlePasteImport}
        onGenerateLink4Deal={handleGenerateLink4Deal}
        pasteImporting={pasteImporting}
        generating={generating}
      />
      <Box>
        <Text fontSize="$sm" color="$textLight600" mb="$1">
          {t.addManual}
        </Text>
        <HStack space="sm" alignItems="center">
          <Input flex={1} size="sm">
            <InputField
              placeholder={t.placeholder}
              value={manualAddress}
              onChangeText={setManualAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>
          <Button size="sm" bg={brand} onPress={handleAddManual} isDisabled={adding}>
            <ButtonText>{t.addButton}</ButtonText>
          </Button>
        </HStack>
      </Box>
      {addresses.length === 0 ? (
        <Text fontSize="$sm" color="$textLight500">
          {noAddressesManual}
        </Text>
      ) : (
        <VStack space="sm">
          {addresses.map((item) => (
            <Box
              key={item.id}
              bg="$backgroundLight50"
              borderRadius="$lg"
              p="$3"
              borderLeftWidth={4}
              borderLeftColor={item.isDefault ? {brand} : '$borderLight300'}
            >
              <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
                <VStack flex={1} space="xs">
                  <Text fontSize="$sm" fontWeight="$medium" color="$textLight900" numberOfLines={1}>
                    {item.label || shortenAddress(item.address)}
                  </Text>
                  <Text fontSize="$xs" color="$textLight500" numberOfLines={1}>
                    {formatAddressForUi(item.address, revealWalletAddresses)}
                  </Text>
                  {item.isDefault && (
                    <Text fontSize="$xs" color={brand} fontWeight="$medium">
                      {t.defaultLabel}
                    </Text>
                  )}
                </VStack>
                <HStack space="xs">
                  {!item.isDefault && (
                    <Pressable onPress={() => handleSetDefault(item.id)}>
                      <Text fontSize="$xs" color={brand} fontWeight="$medium">
                        {t.setDefault}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleRemove(item)}>
                    <Text fontSize="$xs" color="$error600">{t.remove}</Text>
                  </Pressable>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </VStack>
  );
}

/** Versión con MetaMask: usa useSDK (solo se renderiza cuando hay MetaMaskProvider). */
function WalletAddressSectionWithMetaMask({
  language,
  onAddressesChange,
}: WalletAddressSectionProps) {
  const { brand } = useBrandTheme();
  const { revealWalletAddresses } = useVerificationAccess();
  const [addresses, setAddresses] = useState<WalletAddressItem[]>([]);
  const [manualAddress, setManualAddress] = useState('');
  const [adding, setAdding] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pasteImporting, setPasteImporting] = useState(false);

  const sdk = useSDK();
  const canConnectMetaMask = Boolean(sdk?.sdk?.connect);
  const t = translations(language);

  const loadAddresses = useCallback(async () => {
    const list = await getWalletAddresses();
    setAddresses(list);
    onAddressesChange?.(list);
  }, [onAddressesChange]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleConnectMetaMask = useCallback(async () => {
    if (!canConnectMetaMask || !sdk?.sdk?.connect) {
      Alert.alert(t.connectMetaMask, t.notAvailable);
      return;
    }
    setConnecting(true);
    setSdkError(null);
    try {
      const accounts = await sdk.sdk.connect();
      const account = accounts?.[0];
      if (account) {
        const added = await addWalletAddress(account, 'metamask', 'MetaMask', 'ethereum');
        if (added) await loadAddresses();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Connection failed';
      setSdkError(message);
      Alert.alert(t.connectMetaMask, message || t.couldNotConnect);
    } finally {
      setConnecting(false);
    }
  }, [canConnectMetaMask, sdk, t, loadAddresses]);

  const handlePasteImport = useCallback(async () => {
    setPasteImporting(true);
    try {
      const text = await Clipboard.getStringAsync();
      const trimmed = (text || '').trim();
      if (!isValidEvmAddress(trimmed)) {
        Alert.alert(t.importClipboard, t.emptyClipboard);
        return;
      }
      const label = language === 'es' ? 'Importado (MetaMask)' : 'Imported (MetaMask)';
      const added = await addWalletAddress(trimmed, 'manual', label, DEFAULT_EVM_IMPORT_CHAIN);
      if (added) {
        await loadAddresses();
      } else {
        Alert.alert(t.importClipboard, t.alreadyAdded);
      }
    } finally {
      setPasteImporting(false);
    }
  }, [t, language, loadAddresses]);

  const runGeneratePolygonWallet = useCallback(async () => {
    setGenerating(true);
    try {
      await createLink4DealPolygonWallet();
      await loadAddresses();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'DUPLICATE_OR_INVALID') {
        Alert.alert(t.generateLink4Deal, t.alreadyAdded);
      } else {
        Alert.alert(t.generateLink4Deal, t.link4dealError);
      }
    } finally {
      setGenerating(false);
    }
  }, [t, loadAddresses]);

  const handleGenerateLink4Deal = useCallback(() => {
    Alert.alert(
      formatBilingualAlertTitle(
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.titleEs,
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.titleEn
      ),
      formatBilingualAlertMessage(
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.messageEs,
        GENERATE_LUX_TOKEN_POLYGON_CONFIRM.messageEn
      ),
      [
        {
          text:
            language === 'es'
              ? GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonCancelEs
              : GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonCancelEn,
          style: 'cancel',
        },
        {
          text:
            language === 'es'
              ? GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonGenerateEs
              : GENERATE_LUX_TOKEN_POLYGON_CONFIRM.buttonGenerateEn,
          onPress: () => void runGeneratePolygonWallet(),
        },
      ]
    );
  }, [language, runGeneratePolygonWallet]);

  const handleAddManual = useCallback(async () => {
    const trimmed = manualAddress.trim();
    if (!isValidEvmAddress(trimmed)) {
      Alert.alert(t.addManual, t.invalidAddress);
      return;
    }
    setAdding(true);
    try {
      const added = await addWalletAddress(trimmed, 'manual', undefined, DEFAULT_EVM_IMPORT_CHAIN);
      if (added) {
        setManualAddress('');
        await loadAddresses();
      } else {
        Alert.alert(t.addManual, t.alreadyAdded);
      }
    } finally {
      setAdding(false);
    }
  }, [manualAddress, t, loadAddresses]);

  const handleSetDefault = useCallback(
    async (id: string) => {
      await setDefaultWalletAddress(id);
      await loadAddresses();
    },
    [loadAddresses]
  );

  const handleRemove = useCallback(
    (item: WalletAddressItem) => {
      Alert.alert(t.confirmRemoveTitle, t.confirmRemoveMessage, [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.remove,
          style: 'destructive',
          onPress: async () => {
            if (item.source === 'link4deal') {
              await deleteStoredPolygonPrivateKey(item.id);
            }
            await removeWalletAddress(item.id);
            await loadAddresses();
          },
        },
      ]);
    },
    [t, loadAddresses]
  );

  const noAddressesText =
    language === 'es'
      ? `Aún no hay direcciones. Conecta MetaMask, importa desde el portapapeles, genera ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}) o escribe 0x.`
      : `No addresses yet. Connect MetaMask, import from clipboard, generate ${TOKEN_SYMBOL} (${ERC20_TOKEN_NAME}), or type 0x.`;

  return (
    <VStack space="md">
      <Text fontSize="$lg" fontWeight="$bold" color="$textLight900">
        {t.sectionTitle}
      </Text>
      {canConnectMetaMask && (
        <Button
          size="md"
          variant="outline"
          borderColor={brand}
          onPress={handleConnectMetaMask}
          isDisabled={connecting}
        >
          <ButtonText color={brand}>
            {connecting ? t.connecting : t.connectMetaMask}
          </ButtonText>
        </Button>
      )}
      <WalletEvmImportBlock
        language={language}
        brand={brand}
        onPasteImport={handlePasteImport}
        onGenerateLink4Deal={handleGenerateLink4Deal}
        pasteImporting={pasteImporting}
        generating={generating}
      />
      <Box>
        <Text fontSize="$sm" color="$textLight600" mb="$1">
          {t.addManual}
        </Text>
        <HStack space="sm" alignItems="center">
          <Input flex={1} size="sm">
            <InputField
              placeholder={t.placeholder}
              value={manualAddress}
              onChangeText={setManualAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Input>
          <Button size="sm" bg={brand} onPress={handleAddManual} isDisabled={adding}>
            <ButtonText>{t.addButton}</ButtonText>
          </Button>
        </HStack>
      </Box>
      {addresses.length === 0 ? (
        <Text fontSize="$sm" color="$textLight500">
          {noAddressesText}
        </Text>
      ) : (
        <VStack space="sm">
          {addresses.map((item) => (
            <Box
              key={item.id}
              bg="$backgroundLight50"
              borderRadius="$lg"
              p="$3"
              borderLeftWidth={4}
              borderLeftColor={item.isDefault ? {brand} : '$borderLight300'}
            >
              <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
                <VStack flex={1} space="xs">
                  <Text fontSize="$sm" fontWeight="$medium" color="$textLight900" numberOfLines={1}>
                    {item.label || shortenAddress(item.address)}
                  </Text>
                  <Text fontSize="$xs" color="$textLight500" numberOfLines={1}>
                    {formatAddressForUi(item.address, revealWalletAddresses)}
                  </Text>
                  {item.isDefault && (
                    <Text fontSize="$xs" color={brand} fontWeight="$medium">
                      {t.defaultLabel}
                    </Text>
                  )}
                </VStack>
                <HStack space="xs">
                  {!item.isDefault && (
                    <Pressable onPress={() => handleSetDefault(item.id)}>
                      <Text fontSize="$xs" color={brand} fontWeight="$medium">
                        {t.setDefault}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => handleRemove(item)}>
                    <Text fontSize="$xs" color="$error600">{t.remove}</Text>
                  </Pressable>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
      {sdkError && (
        <Text fontSize="$xs" color="$textLight500">
          MetaMask SDK: {sdkError}
        </Text>
      )}
    </VStack>
  );
}

export default function WalletAddressSection(props: WalletAddressSectionProps) {
  const metaMaskUnavailable = useMetaMaskUnavailable();
  return metaMaskUnavailable ? (
    <WalletAddressSectionManualOnly {...props} />
  ) : (
    <WalletAddressSectionWithMetaMask {...props} />
  );
}
