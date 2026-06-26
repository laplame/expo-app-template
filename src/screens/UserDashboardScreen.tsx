/**
 * Dashboard del rol usuario (consumidor): KYC, wallet, cupones.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, Text, VStack, HStack, Button, ButtonText } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import { useWalletBalance } from '../context/WalletBalanceContext';
import { useVerificationAccess } from '../context/VerificationAccessContext';
import { isKycComplete } from '../services/storage';
import { TOKEN_SYMBOL } from '../constants/luxToken';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getRoleLabel } from '../types/authRoles';

export default function UserDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, status, logout, effectiveRole } = useAuth();
  const { language } = useSettings();
  const { brand } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const { luxaeBalance, refreshLuxaeBalance } = useWalletBalance();
  const { revealWalletAddresses } = useVerificationAccess();
  const [kycDone, setKycDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const done = await isKycComplete();
    setKycDone(done);
    await refreshLuxaeBalance();
    setRefreshing(false);
  }, [refreshLuxaeBalance]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: 'Panel de usuario',
            subtitle: 'Cupones, recompensas y verificación KYC.',
            role: 'Rol',
            kyc: 'Verificación KYC',
            kycDone: 'Completada',
            kycPending: 'Pendiente — completa NYC en el menú',
            wallet: 'Saldo LUXAE',
            actions: 'Accesos rápidos',
            coupons: 'Ver cupones',
            kycScreen: 'Completar KYC',
            walletScreen: 'Ir a billetera',
            influencers: 'Influencers y votar',
            login: 'Iniciar sesión',
            logout: 'Cerrar sesión',
            guest: 'Sin sesión JWT — puedes usar cupones con registro rápido.',
          }
        : {
            title: 'User dashboard',
            subtitle: 'Coupons, rewards, and KYC verification.',
            role: 'Role',
            kyc: 'KYC verification',
            kycDone: 'Complete',
            kycPending: 'Pending — complete NYC from the menu',
            wallet: 'LUXAE balance',
            actions: 'Quick access',
            coupons: 'View coupons',
            kycScreen: 'Complete KYC',
            walletScreen: 'Go to wallet',
            influencers: 'Influencers & vote',
            login: 'Sign in',
            logout: 'Sign out',
            guest: 'No JWT session — you can still use coupons with quick signup.',
          },
    [language]
  );

  const displayName =
    (user?.displayName as string | undefined) ??
    user?.email ??
    (language === 'es' ? 'Invitado' : 'Guest');

  return (
    <Box flex={1} bg="#f4f6f8">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 28),
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={brand} />
        }
      >
        <Box bg={brand} borderRadius="$2xl" p="$4" mb="$4">
          <Text fontSize="$xl" fontWeight="$bold" color="$white">
            {strings.title}
          </Text>
          <Text fontSize="$sm" color="$white" opacity={0.92} mt="$2">
            {displayName}
          </Text>
          <Text fontSize="$2xs" color="$white" opacity={0.85} mt="$1">
            {strings.role}: {getRoleLabel(effectiveRole, language)}
          </Text>
        </Box>

        {status !== 'authenticated' ? (
          <Box bg="$white" borderRadius="$xl" p="$4" mb="$4">
            <Text fontSize="$sm" color="$textLight700" mb="$3">
              {strings.guest}
            </Text>
            <Button size="md" bg={brand} onPress={() => navigation.navigate('Login')}>
              <ButtonText>{strings.login}</ButtonText>
            </Button>
          </Box>
        ) : null}

        <VStack space="md" mb="$4">
          <StatCard
            brand={brand}
            label={strings.kyc}
            value={kycDone ? strings.kycDone : strings.kycPending}
            ok={kycDone}
          />
          <StatCard
            brand={brand}
            label={strings.wallet}
            value={`${luxaeBalance.toFixed(2)} ${TOKEN_SYMBOL}`}
            ok
          />
          {!revealWalletAddresses ? (
            <Text fontSize="$2xs" color="$textLight500">
              {language === 'es'
                ? 'Las direcciones de wallet están ocultas hasta completar KYC.'
                : 'Wallet addresses are hidden until KYC is complete.'}
            </Text>
          ) : null}
        </VStack>

        <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
          {strings.actions}
        </Text>
        <VStack space="sm">
          <Button
            size="md"
            bg={brand}
            onPress={() => navigation.navigate('Home', { scrollToPromotions: true })}
          >
            <ButtonText>{strings.coupons}</ButtonText>
          </Button>
          <Button size="md" variant="outline" borderColor={brand} onPress={() => navigation.navigate('NYC')}>
            <ButtonText color={brand}>{strings.kycScreen}</ButtonText>
          </Button>
          <Button size="md" variant="outline" borderColor={brand} onPress={() => navigation.navigate('Wallet')}>
            <ButtonText color={brand}>{strings.walletScreen}</ButtonText>
          </Button>
          <Button
            size="md"
            variant="outline"
            borderColor={brand}
            onPress={() => navigation.navigate('InfluencersList')}
          >
            <ButtonText color={brand}>{strings.influencers}</ButtonText>
          </Button>
          {status === 'authenticated' ? (
            <Button size="md" variant="outline" borderColor="$error600" onPress={() => void logout()}>
              <ButtonText color="$error600">{strings.logout}</ButtonText>
            </Button>
          ) : null}
        </VStack>
      </ScrollView>
    </Box>
  );
}

function StatCard({
  brand,
  label,
  value,
  ok,
}: {
  brand: string;
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <Box bg="$white" borderRadius="$xl" p="$4" borderWidth={1} borderColor="$borderLight200">
      <Text fontSize="$xs" color="$textLight500" mb="$1">
        {label}
      </Text>
      <HStack alignItems="center" space="sm">
        <Box w={8} h={8} borderRadius="$full" bg={ok ? '#22c55e' : '#f59e0b'} />
        <Text fontSize="$md" fontWeight="$semibold" color={brand} flex={1}>
          {value}
        </Text>
      </HStack>
    </Box>
  );
}
