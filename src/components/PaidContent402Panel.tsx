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

const BG = '#0c0c0c';
const LINE = '#1c1c1c';
const TEXT = '#e8e8e8';
const MUTED = '#8a8a8a';
const ACCENT = '#1d9bf0';

type Props = {
  language: UiLanguage;
};

export default function PaidContent402Panel({ language }: Props) {
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t.paid402Title}</Text>
      <Text style={styles.hint}>{t.paid402Hint}</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder={t.paid402UrlPh}
        placeholderTextColor={MUTED}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {!connected && !mmUnavailable ? (
        <Pressable onPress={connectMm} style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>MetaMask</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={runLoad}
        disabled={busy}
        style={[styles.btn, busy && styles.btnDisabled]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t.paid402Load}</Text>
        )}
      </Pressable>
      {result ? (
        <View style={styles.out}>
          <Text style={styles.outLabel}>
            {t.paid402Status}: {result.status}
          </Text>
          <ScrollView style={styles.scroll} nestedScrollEnabled>
            <Text style={styles.outBody} selectable>
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
  wrap: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 12,
    backgroundColor: BG,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
  },
  title: { color: TEXT, fontSize: 14, fontWeight: '700' },
  hint: { color: MUTED, fontSize: 11, marginTop: 6, lineHeight: 16 },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    padding: 10,
    color: TEXT,
    fontSize: 13,
  },
  btn: {
    marginTop: 10,
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnSecondaryText: { color: ACCENT, fontSize: 13, fontWeight: '600' },
  out: { marginTop: 12 },
  outLabel: { color: MUTED, fontSize: 12, marginBottom: 6 },
  scroll: { maxHeight: 160 },
  outBody: { color: TEXT, fontSize: 12 },
});
