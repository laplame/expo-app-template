import React, { useEffect, useState } from 'react';
import { Modal, View, Pressable as RNPressable } from 'react-native';
import { Box, Text, Button, ButtonText, HStack } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { getPromoSignupSeen, setPromoSignupSeen } from '../services/storage';
import { WELCOME_BONUS_LUXAE, USD_TO_MXN } from '../context/WalletBalanceContext';
import { TOKEN_SYMBOL } from '../constants/luxToken';

export default function PromoSignupPopUp() {
  const navigation = useNavigation();
  const { language, currency } = useSettings();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPromoSignupSeen().then((seen) => {
      if (mounted) {
        setReady(true);
        setVisible(!seen);
      }
    });
    return () => { mounted = false; };
  }, []);

  const dismiss = () => {
    setPromoSignupSeen();
    setVisible(false);
  };

  const goToSignUp = () => {
    setPromoSignupSeen();
    setVisible(false);
    const nav = navigation as any;
    if (nav.navigate) {
      nav.navigate('NYC');
    }
  };

  const isEs = language === 'es';
  const mxnAmount = Math.round(WELCOME_BONUS_LUXAE * USD_TO_MXN);
  const amountText = isEs
    ? (currency === 'MXN' ? `equivalen a ≈ $${mxnAmount.toLocaleString('es-MX')} MXN` : `equivalen a ${WELCOME_BONUS_LUXAE} USD`)
    : (currency === 'MXN' ? `equivalent to ~$${mxnAmount.toLocaleString('en-US')} MXN` : `equivalent to $${WELCOME_BONUS_LUXAE} USD`);

  const title = isEs ? '¡Oferta de bienvenida!' : 'Welcome offer!';
  const message = isEs
    ? `Date de alta y recibe ${WELCOME_BONUS_LUXAE} ${TOKEN_SYMBOL} (${amountText}).`
    : `Sign up and get ${WELCOME_BONUS_LUXAE} ${TOKEN_SYMBOL} (${amountText}).`;
  const cta = isEs ? 'Registrarme' : 'Sign up';
  const close = isEs ? 'Cerrar' : 'Close';

  if (!ready || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <RNPressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
        onPress={dismiss}
      >
        <View style={{ width: '100%', maxWidth: 340 }}>
          <Box bg="$white" borderRadius="$2xl" p="$6" alignItems="center">
            <Text fontSize="$2xl" fontWeight="$bold" color="#00704A" mb="$2">
              {title}
            </Text>
            <Text fontSize="$md" color="$textLight700" textAlign="center" mb="$5">
              {message}
            </Text>
            <HStack space="md" justifyContent="center" flexWrap="wrap">
              <Button size="md" bg="#00704A" onPress={goToSignUp}>
                <ButtonText>{cta}</ButtonText>
              </Button>
              <Button size="md" variant="outline" borderColor="#00704A" onPress={dismiss}>
                <ButtonText color="#00704A">{close}</ButtonText>
              </Button>
            </HStack>
          </Box>
        </View>
      </RNPressable>
    </Modal>
  );
}
