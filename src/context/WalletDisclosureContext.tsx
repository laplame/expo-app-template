import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Modal, View, ScrollView } from 'react-native';
import { Box, Text, Button, ButtonText, VStack, HStack } from '@gluestack-ui/themed';
import { useSettings } from './SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import {
  getWalletDisclosuresAck,
  setWalletDisclosuresAck,
} from '../services/storage';
import {
  WALLET_DISCLOSURE_STEPS,
  WALLET_REMINDER_BULLETS,
  WALLET_DISCLOSURE_UI,
} from './walletDisclosureCopy';

interface WalletDisclosureContextValue {
  /** Llamar cuando la pantalla Wallet recibe foco */
  notifyWalletScreenFocused: () => void;
}

const WalletDisclosureContext = createContext<WalletDisclosureContextValue | null>(null);

export function useWalletDisclosure(): WalletDisclosureContextValue {
  const ctx = useContext(WalletDisclosureContext);
  if (!ctx) {
    throw new Error('useWalletDisclosure must be used within WalletDisclosureProvider');
  }
  return ctx;
}

export function WalletDisclosureProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings();
  const { brand } = useBrandTheme();
  const lang = language === 'es' ? 'es' : 'en';
  const ui = WALLET_DISCLOSURE_UI[lang];

  const [ackLoaded, setAckLoaded] = useState(false);
  const [disclosuresAck, setDisclosuresAck] = useState(false);
  const [fullFlowVisible, setFullFlowVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [reminderVisible, setReminderVisible] = useState(false);

  const reminderDismissedSession = useRef(false);
  const skipReminderAfterComplete = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getWalletDisclosuresAck().then((ack) => {
      if (cancelled) return;
      setDisclosuresAck(ack);
      setAckLoaded(true);
      if (!ack) {
        setFullFlowVisible(true);
        setStep(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const completeFullFlow = useCallback(async () => {
    await setWalletDisclosuresAck(true);
    setDisclosuresAck(true);
    setFullFlowVisible(false);
    setStep(0);
    skipReminderAfterComplete.current = true;
  }, []);

  const deferFullFlow = useCallback(() => {
    setFullFlowVisible(false);
    setStep(0);
  }, []);

  const notifyWalletScreenFocused = useCallback(() => {
    if (!ackLoaded) return;
    if (!disclosuresAck) {
      setFullFlowVisible(true);
      setStep(0);
      return;
    }
    if (skipReminderAfterComplete.current) {
      skipReminderAfterComplete.current = false;
      return;
    }
    if (!reminderDismissedSession.current) {
      setReminderVisible(true);
    }
  }, [ackLoaded, disclosuresAck]);

  const dismissReminder = useCallback(() => {
    reminderDismissedSession.current = true;
    setReminderVisible(false);
  }, []);

  const lastStep = WALLET_DISCLOSURE_STEPS.length - 1;
  const isLast = step >= lastStep;
  const stepData = WALLET_DISCLOSURE_STEPS[step];

  const value = useMemo(
    () => ({ notifyWalletScreenFocused }),
    [notifyWalletScreenFocused]
  );

  return (
    <WalletDisclosureContext.Provider value={value}>
      {children}

      <Modal
        visible={fullFlowVisible}
        transparent
        animationType="fade"
        onRequestClose={deferFullFlow}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
          <Box bg="$white" borderRadius="$xl" maxHeight="88%" overflow="hidden" borderWidth={1} borderColor="$borderLight200">
            <VStack p="$5" space="md">
              <VStack space="xs">
                <Text fontSize="$sm" fontWeight="$bold" color="$textLight900">
                  {ui.fullTitle}
                </Text>
                <Text fontSize="$xs" color="$textLight600">
                  {ui.fullTitleAlt}
                </Text>
              </VStack>
              <VStack space="xs">
                <Text fontSize="$xs" color={brand} fontWeight="$semibold">
                  {ui.stepIndicator(step + 1, WALLET_DISCLOSURE_STEPS.length)}
                </Text>
                <Text fontSize="$xs" color="$textLight500">
                  {ui.stepIndicatorAlt(step + 1, WALLET_DISCLOSURE_STEPS.length)}
                </Text>
              </VStack>
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator>
                <VStack space="md">
                  <Box>
                    <Text fontSize="$xs" fontWeight="$semibold" color={brand} mb="$1">
                      {ui.langLabelEs}
                    </Text>
                    <Text fontSize="$lg" fontWeight="$bold" color="$textLight900" mb="$2">
                      {stepData?.titleEs ?? ''}
                    </Text>
                    <Text fontSize="$md" color="$textLight700" lineHeight={24}>
                      {stepData?.bodyEs ?? ''}
                    </Text>
                  </Box>
                  <Box h={1} bg="$borderLight200" my="$1" />
                  <Box>
                    <Text fontSize="$xs" fontWeight="$semibold" color={brand} mb="$1">
                      {ui.langLabelEn}
                    </Text>
                    <Text fontSize="$lg" fontWeight="$bold" color="$textLight900" mb="$2">
                      {stepData?.titleEn ?? ''}
                    </Text>
                    <Text fontSize="$md" color="$textLight700" lineHeight={24}>
                      {stepData?.bodyEn ?? ''}
                    </Text>
                  </Box>
                </VStack>
              </ScrollView>
              <HStack space="sm" justifyContent="flex-end" flexWrap="wrap" mt="$2">
                {step === 0 ? (
                  <Button size="sm" variant="outline" onPress={deferFullFlow}>
                    <ButtonText>{ui.later}</ButtonText>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onPress={() => setStep((s) => Math.max(0, s - 1))}>
                    <ButtonText>{ui.back}</ButtonText>
                  </Button>
                )}
                <Button size="sm" bg={brand} onPress={isLast ? completeFullFlow : () => setStep((s) => s + 1)}>
                  <ButtonText color="$white">{isLast ? ui.accept : ui.next}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </Box>
        </View>
      </Modal>

      <Modal visible={reminderVisible} transparent animationType="fade" onRequestClose={dismissReminder}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
          <Box bg="$white" borderRadius="$xl" p="$5" maxHeight="88%" borderWidth={1} borderColor="$borderLight200">
            <VStack space="xs" mb="$3">
              <Text fontSize="$lg" fontWeight="$bold" color={brand}>
                {ui.reminderTitle}
              </Text>
              <Text fontSize="$sm" fontWeight="$semibold" color="$textLight600">
                {ui.reminderTitleAlt}
              </Text>
            </VStack>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator>
              <VStack space="md" mb="$4">
                <Box>
                  <Text fontSize="$xs" fontWeight="$semibold" color={brand} mb="$2">
                    {ui.langLabelEs}
                  </Text>
                  <VStack space="sm">
                    {WALLET_REMINDER_BULLETS.es.map((line, i) => (
                      <HStack key={`es-${i}`} space="sm" alignItems="flex-start">
                        <Text color="$textLight600" mt="$0.5">
                          •
                        </Text>
                        <Text flex={1} fontSize="$sm" color="$textLight700" lineHeight={22}>
                          {line}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
                <Box h={1} bg="$borderLight200" />
                <Box>
                  <Text fontSize="$xs" fontWeight="$semibold" color={brand} mb="$2">
                    {ui.langLabelEn}
                  </Text>
                  <VStack space="sm">
                    {WALLET_REMINDER_BULLETS.en.map((line, i) => (
                      <HStack key={`en-${i}`} space="sm" alignItems="flex-start">
                        <Text color="$textLight600" mt="$0.5">
                          •
                        </Text>
                        <Text flex={1} fontSize="$sm" color="$textLight700" lineHeight={22}>
                          {line}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </ScrollView>
            <Button size="sm" bg={brand} alignSelf="flex-end" onPress={dismissReminder}>
              <ButtonText color="$white">{ui.reminderOk}</ButtonText>
            </Button>
          </Box>
        </View>
      </Modal>
    </WalletDisclosureContext.Provider>
  );
}
