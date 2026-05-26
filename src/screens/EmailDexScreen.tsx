import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SimplePool, getPublicKey, nip05 } from 'nostr-tools';
import { Box, Button, ButtonText, HStack, VStack } from '@gluestack-ui/themed';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getEmailDexStrings } from '../i18n/uiStrings';
import { getOrCreateNostrSecretKey, npubFromSecret } from '../services/nostrIdentity';
import { getNostrLocalProfile } from '../services/nostrSocialStorage';
import {
  getEmailDexMessages,
  markEmailDexRead,
} from '../services/nostrMailStorage';
import { sendEmailDexMessage, syncEmailDexInbox } from '../services/nostrMailService';
import type { NostrMailMessage } from '../types/nostrMail';
import { EMAILDEX_RELAYS, NMAIL_WEB_APP_URL } from '../constants/nostrMailRelays';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EmailDex'>;

const inputStyle = {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#e5e5e5',
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
} as const;

export default function EmailDexScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { language } = useSettings();
  const { brand, colors: themeColors } = useBrandTheme();
  const t = useMemo(() => getEmailDexStrings(language), [language]);

  const poolRef = useRef<SimplePool | null>(null);
  const skRef = useRef<Uint8Array | null>(null);

  const [npub, setNpub] = useState('');
  const [pubHex, setPubHex] = useState('');
  const [nip05Address, setNip05Address] = useState('');
  const [nip05Verified, setNip05Verified] = useState(false);
  const [messages, setMessages] = useState<NostrMailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [toInput, setToInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadLocal = useCallback(async () => {
    setMessages(await getEmailDexMessages());
  }, []);

  useEffect(() => {
    poolRef.current = new SimplePool();
    return () => {
      poolRef.current?.close(EMAILDEX_RELAYS);
      poolRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sk = await getOrCreateNostrSecretKey();
        const profile = await getNostrLocalProfile();
        if (cancelled) return;
        skRef.current = sk;
        const hex = getPublicKey(sk);
        setPubHex(hex);
        setNpub(npubFromSecret(sk));
        setNip05Address(profile.nip05.trim());
        if (profile.nip05.trim() && nip05.isNip05(profile.nip05.trim())) {
          try {
            const ok = await nip05.isValid(hex, profile.nip05.trim());
            if (!cancelled) setNip05Verified(ok);
          } catch {
            if (!cancelled) setNip05Verified(false);
          }
        } else {
          setNip05Verified(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const fromHint = nip05Address || npub || pubHex;

  const handleSync = useCallback(async () => {
    const pool = poolRef.current;
    const sk = skRef.current;
    if (!pool || !sk || !pubHex) return;
    setSyncing(true);
    try {
      const res = await syncEmailDexInbox({
        pool,
        recipientSecretKey: sk,
        recipientPubkey: pubHex,
      });
      await loadLocal();
      if (res.error) Alert.alert(t.title, t.syncFail);
      else if (res.imported > 0) Alert.alert(t.title, t.syncOk.replace('%d', String(res.imported)));
    } finally {
      setSyncing(false);
    }
  }, [loadLocal, pubHex, t.syncFail, t.syncOk, t.title]);

  const handleSend = useCallback(async () => {
    const pool = poolRef.current;
    const sk = skRef.current;
    if (!pool || !sk || !pubHex) return;
    if (!toInput.trim() || !bodyInput.trim()) return;
    setSending(true);
    try {
      const res = await sendEmailDexMessage({
        pool,
        senderSecretKey: sk,
        senderPubkey: pubHex,
        fromHint,
        toInput,
        subject: subjectInput,
        body: bodyInput,
      });
      if (!res.ok) {
        Alert.alert(
          t.title,
          res.error === 'invalid_recipient' ? t.invalidRecipient : t.sendFail
        );
        return;
      }
      Alert.alert(t.title, t.sentOk);
      setComposeOpen(false);
      setToInput('');
      setSubjectInput('');
      setBodyInput('');
      await loadLocal();
    } finally {
      setSending(false);
    }
  }, [bodyInput, fromHint, loadLocal, pubHex, subjectInput, t, toInput]);

  const openMessage = useCallback(
    async (msg: NostrMailMessage) => {
      setSelectedId(msg.id);
      if (!msg.read) {
        await markEmailDexRead(msg.id);
        await loadLocal();
      }
    },
    [loadLocal]
  );

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  if (loading) {
    return (
      <Box flex={1} bg={themeColors.bg} justifyContent="center" alignItems="center">
        <ActivityIndicator color={brand} />
      </Box>
    );
  }

  return (
    <Box flex={1} bg={themeColors.bg}>
      <StatusBar style="dark" />
      <Box bg={brand} pt={Math.max(insets.top, 12)} pb="$4" px="$4">
        <HStack alignItems="center" justifyContent="space-between" mb="$2">
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={{ color: '#fff', fontSize: 16 }}>← {t.back}</Text>
          </Pressable>
          <Box bg="rgba(255,255,255,0.2)" px="$2" py="$1" borderRadius="$md">
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{t.phaseBadge}</Text>
          </Box>
        </HStack>
        <Text fontSize="$2xl" fontWeight="$bold" color="$white">
          {t.title}
        </Text>
        <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
          {t.subtitle}
        </Text>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={handleSync} tintColor={brand} />
        }
      >
        <Box bg="$white" borderRadius="$xl" p="$4" mb="$4" borderWidth={1} borderColor="$borderLight200">
          <Text fontSize="$md" fontWeight="$bold" color="$textLight900" mb="$2">
            {t.nip05Title}
          </Text>
          {nip05Address ? (
            <>
              <Text fontSize="$sm" color={brand} fontWeight="$semibold">
                {nip05Address}
              </Text>
              <Text fontSize="$xs" color="$textLight600" mt="$1">
                {nip05Verified ? `✓ ${t.nip05Verified}` : t.nip05Unverified}
              </Text>
            </>
          ) : (
            <Text fontSize="$sm" color="$textLight600">
              {t.nip05Empty}
            </Text>
          )}
          {npub ? (
            <Text fontSize="$2xs" color="$textLight500" mt="$2" numberOfLines={2}>
              {t.npubLabel}: {npub}
            </Text>
          ) : null}
        </Box>

        <HStack space="sm" mb="$4">
          <Button flex={1} size="sm" variant="outline" borderColor={brand} onPress={handleSync} isDisabled={syncing}>
            <ButtonText color={brand}>{syncing ? t.syncing : t.sync}</ButtonText>
          </Button>
          <Button flex={1} size="sm" bg={brand} onPress={() => setComposeOpen(true)}>
            <ButtonText>{t.compose}</ButtonText>
          </Button>
        </HStack>

        <Text fontSize="$lg" fontWeight="$bold" color="$textLight900" mb="$2">
          {t.inboxTitle}
        </Text>
        {messages.length === 0 ? (
          <Text fontSize="$sm" color="$textLight500">{t.inboxEmpty}</Text>
        ) : (
          <VStack space="sm">
            {messages.map((item) => (
              <Pressable key={item.id} onPress={() => openMessage(item)}>
                <Box
                  bg="$white"
                  borderRadius="$lg"
                  p="$3"
                  borderWidth={1}
                  borderColor={item.read ? '$borderLight200' : brand}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text fontSize="$sm" fontWeight="$bold" color="$textLight900" flex={1} numberOfLines={1}>
                      {item.subject}
                    </Text>
                    {!item.read && item.direction === 'in' ? (
                      <Text fontSize="$2xs" color={brand} fontWeight="$bold">
                        {t.unread}
                      </Text>
                    ) : null}
                  </HStack>
                  <Text fontSize="$xs" color="$textLight600" mt="$1" numberOfLines={1}>
                    {t.fromPrefix}: {item.fromPubkey.slice(0, 8)}…
                  </Text>
                </Box>
              </Pressable>
            ))}
          </VStack>
        )}

        <Pressable
          onPress={() => Linking.openURL(NMAIL_WEB_APP_URL).catch(() => {})}
          style={{ marginTop: 24 }}
        >
          <Box bg="$backgroundLight100" borderRadius="$lg" p="$4" borderWidth={1} borderColor="$borderLight200">
            <Text fontSize="$sm" fontWeight="$bold" color={brand}>
              {t.openNmail}
            </Text>
            <Text fontSize="$xs" color="$textLight600" mt="$1">
              {t.openNmailHint}
            </Text>
          </Box>
        </Pressable>
      </ScrollView>

      <Modal visible={composeOpen} animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <Box flex={1} bg={themeColors.bg} pt={Math.max(insets.top, 12)} px="$4">
          <HStack justifyContent="space-between" alignItems="center" mb="$4">
            <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
              {t.compose}
            </Text>
            <Pressable onPress={() => setComposeOpen(false)}>
              <Text style={{ color: brand, fontSize: 18 }}>✕</Text>
            </Pressable>
          </HStack>
          <Text fontSize="$xs" color="$textLight600" mb="$1">
            {t.toLabel}
          </Text>
          <TextInput
            value={toInput}
            onChangeText={setToInput}
            autoCapitalize="none"
            style={inputStyle}
            placeholder="npub1… o alice@dominio.com"
          />
          <Text fontSize="$xs" color="$textLight600" mb="$1" mt="$3">
            {t.subjectLabel}
          </Text>
          <TextInput value={subjectInput} onChangeText={setSubjectInput} style={inputStyle} />
          <Text fontSize="$xs" color="$textLight600" mb="$1" mt="$3">
            {t.bodyLabel}
          </Text>
          <TextInput
            value={bodyInput}
            onChangeText={setBodyInput}
            multiline
            style={[inputStyle, { minHeight: 120, textAlignVertical: 'top' }]}
          />
          <Button mt="$6" bg={brand} onPress={handleSend} isDisabled={sending}>
            <ButtonText>{sending ? t.sending : t.send}</ButtonText>
          </Button>
        </Box>
      </Modal>

      <Modal visible={!!selected} animationType="fade" transparent onRequestClose={() => setSelectedId(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}
          onPress={() => setSelectedId(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Box bg="$white" borderRadius="$xl" p="$5" maxHeight="80%">
              <Text fontSize="$lg" fontWeight="$bold" color="$textLight900" mb="$2">
                {selected?.subject}
              </Text>
              <ScrollView style={{ maxHeight: 320 }}>
                <Text fontSize="$md" color="$textLight700" lineHeight={22}>
                  {selected?.body}
                </Text>
              </ScrollView>
              <Button mt="$4" size="sm" variant="outline" borderColor={brand} onPress={() => setSelectedId(null)}>
                <ButtonText color={brand}>{t.back}</ButtonText>
              </Button>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>
    </Box>
  );
}
