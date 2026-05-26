import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSDK } from '@metamask/sdk-react-native';
import { useMetaMaskUnavailable } from '../context/MetaMaskUnavailableContext';
import { getNetworkP2PStrings } from '../i18n/uiStrings';
import type { UiLanguage } from '../i18n/uiStrings';
import { fetchPaidContentWith402 } from '../services/paidContentHttp';
import { getSocialLayerColors } from '../theme/socialLayerTheme';
import { DEFAULT_APP_THEME_ID, type AppThemeId } from '../theme/appThemes';

type Props = {
  language: UiLanguage;
  /** Sin márgenes ni borde; oculta el título (p. ej. panel inferior de Social Layer). */
  embedded?: boolean;
  appTheme?: AppThemeId;
  /** @deprecated Use appTheme */
  colorScheme?: AppThemeId;
};

export default function PaidContent402Panel({
  language,
  embedded = false,
  appTheme: appThemeProp,
  colorScheme,
}: Props) {
  const appTheme = appThemeProp ?? colorScheme ?? DEFAULT_APP_THEME_ID;
  const c = getSocialLayerColors(appTheme);
  const t = useMemo(() => getNetworkP2PStrings(language), [language]);
  const mmUnavailable = useMetaMaskUnavailable();
  const { provider, connected, account, sdk } = useSDK();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: number; body: string } | null>(null);

  const runLoad = useCallback(async () => {
    const u = url.trim();
    if (!u) return;
    if (mmUnavailable || !provider?.request) {
      Alert.alert('', t.paid402MmUnavailable);
      return;
    }
    const signer = (account ?? '').trim();
    if (!connected || !signer) {
      Alert.alert('', t.paid402ConnectFirst);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const out = await fetchPaidContentWith402(
        u,
        { method: 'GET', headers: { Accept: '*/*' } },
        {
          request: (args) => provider.request(args),
          signerAddress: signer,
        }
      );
      if (!out.ok) {
        Alert.alert('', out.error);
        return;
      }
      setResult({ status: out.status, body: out.body });
    } catch (e: unknown) {
      Alert.alert('', e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }, [account, connected, mmUnavailable, provider, t, url]);

  const connectMm = useCallback(async () => {
    if (!sdk?.connect) {
      Alert.alert('', t.paid402MmUnavailable);
      return;
    }
    try {
      await sdk.connect();
    } catch (e: unknown) {
      Alert.alert('', e instanceof Error ? e.message : 'connect');
    }
  }, [sdk, t.paid402MmUnavailable]);

  const dynamic = {
    wrap: {
      marginHorizontal: embedded ? 0 : 14,
      marginBottom: embedded ? 0 : 12,
      padding: embedded ? 0 : 12,
      backgroundColor: embedded ? 'transparent' : c.surface,
      borderRadius: 10,
      borderWidth: embedded ? 0 : 1,
      borderColor: c.line,
    },
    title: { color: c.text, fontSize: 14, fontWeight: '700' as const },
    hint: { color: c.muted, fontSize: 11, marginTop: 6, lineHeight: 16 },
    input: {
      marginTop: 10,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 8,
      padding: 10,
      color: c.text,
      fontSize: 13,
    },
    btn: {
      marginTop: 10,
      backgroundColor: c.accent,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center' as const,
    },
    btnSecondaryText: { color: c.accent, fontSize: 13, fontWeight: '600' as const },
    outLabel: { color: c.muted, fontSize: 12, marginBottom: 6 },
    outBody: { color: c.text, fontSize: 12 },
  };

  return (
    <View style={dynamic.wrap}>
      {!embedded ? <Text style={dynamic.title}>{t.paid402Title}</Text> : null}
      <Text style={dynamic.hint}>{t.paid402Hint}</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder={t.paid402UrlPh}
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        autoCorrect={false}
        style={dynamic.input}
      />
      {!connected && !mmUnavailable ? (
        <Pressable onPress={connectMm} style={styles.btnSecondary}>
          <Text style={dynamic.btnSecondaryText}>MetaMask</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={runLoad}
        disabled={busy}
        style={[dynamic.btn, busy && styles.btnDisabled]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t.paid402Load}</Text>
        )}
      </Pressable>
      {result ? (
        <View style={styles.out}>
          <Text style={dynamic.outLabel}>
            {t.paid402Status}: {result.status}
          </Text>
          <ScrollView style={styles.scroll} nestedScrollEnabled>
            <Text style={dynamic.outBody} selectable>
              {result.body.length > 8000
                ? `${result.body.slice(0, 8000)}…`
                : result.body}
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  out: { marginTop: 12 },
  scroll: { maxHeight: 160 },
});
