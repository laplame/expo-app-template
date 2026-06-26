/**
 * Dashboard del rol negocio: KYB, promociones propias, subir ofertas.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, RefreshControl, Linking } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, Text, VStack, Button, ButtonText, HStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import { getKybVerified, setKybVerified } from '../services/storage';
import { getPromotions, type ApiPromotionDoc } from '../services/promotionsApi';
import { SITE_PROMO_URLS } from '../services/promotionsApi';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getRoleLabel } from '../types/authRoles';
import RoleGate from '../components/RoleGate';

export default function BusinessDashboardScreen() {
  return (
    <RoleGate permission="upload_promotions">
      <BusinessDashboardContent />
    </RoleGate>
  );
}

function BusinessDashboardContent() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, effectiveRole } = useAuth();
  const { language } = useSettings();
  const { brand } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const [kybDone, setKybDone] = useState(false);
  const [promos, setPromos] = useState<ApiPromotionDoc[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: 'Panel de negocio',
            subtitle: 'KYB, promociones sin deal y mapa.',
            kyb: 'Verificación KYB',
            kybDone: 'Verificado',
            kybPending: 'Pendiente — solicita verificación de negocio',
            markKyb: 'Marcar KYB demo (dev)',
            myPromos: 'Promociones recientes (feed)',
            noPromos: 'Aún no hay promociones en el feed.',
            upload: 'Subir promoción sin deal',
            dealWeb: 'Promoción con deal (web)',
            map: 'Mapa de promociones',
            logout: 'Cerrar sesión',
          }
        : {
            title: 'Business dashboard',
            subtitle: 'KYB, no-deal promotions, and map.',
            kyb: 'KYB verification',
            kybDone: 'Verified',
            kybPending: 'Pending — request business verification',
            markKyb: 'Mark KYB demo (dev)',
            myPromos: 'Recent promotions (feed)',
            noPromos: 'No promotions in the feed yet.',
            upload: 'Upload no-deal promotion',
            dealWeb: 'Promotion with deal (web)',
            map: 'Promotions map',
            logout: 'Sign out',
          },
    [language]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setKybDone(await getKybVerified());
    const res = await getPromotions({ limit: 5, status: 'active' });
    setPromos(res.ok && res.docs ? res.docs.slice(0, 5) : []);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const displayName = (user?.displayName as string | undefined) ?? user?.email ?? '—';

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
            {getRoleLabel(effectiveRole, language)}
          </Text>
        </Box>

        <Box bg="$white" borderRadius="$xl" p="$4" mb="$4" borderWidth={1} borderColor="$borderLight200">
          <Text fontSize="$xs" color="$textLight500">
            {strings.kyb}
          </Text>
          <HStack alignItems="center" space="sm" mt="$2">
            <Box w={8} h={8} borderRadius="$full" bg={kybDone ? '#22c55e' : '#f59e0b'} />
            <Text fontSize="$md" fontWeight="$semibold" color={brand}>
              {kybDone ? strings.kybDone : strings.kybPending}
            </Text>
          </HStack>
          {process.env.EXPO_PUBLIC_AUTH_DEV_MODE === 'true' ? (
            <Button
              size="sm"
              mt="$3"
              variant="outline"
              borderColor={brand}
              onPress={async () => {
                await setKybVerified(!kybDone);
                await refresh();
              }}
            >
              <ButtonText color={brand}>{strings.markKyb}</ButtonText>
            </Button>
          ) : null}
        </Box>

        <VStack space="sm" mb="$4">
          <Button size="md" bg={brand} onPress={() => navigation.navigate('UploadPromotions')}>
            <ButtonText>{strings.upload}</ButtonText>
          </Button>
          <Button
            size="md"
            variant="outline"
            borderColor={brand}
            onPress={() => Linking.openURL(SITE_PROMO_URLS.createPromotion)}
          >
            <ButtonText color={brand}>{strings.dealWeb}</ButtonText>
          </Button>
          <Button
            size="md"
            variant="outline"
            borderColor={brand}
            onPress={() => navigation.navigate('PromotionsMap')}
          >
            <ButtonText color={brand}>{strings.map}</ButtonText>
          </Button>
        </VStack>

        <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
          {strings.myPromos}
        </Text>
        {promos.length === 0 ? (
          <Text fontSize="$sm" color="$textLight600">
            {strings.noPromos}
          </Text>
        ) : (
          <VStack space="sm">
            {promos.map((p) => (
              <Box
                key={p._id ?? p.id}
                bg="$white"
                borderRadius="$lg"
                p="$3"
                borderWidth={1}
                borderColor="$borderLight200"
              >
                <Text fontSize="$sm" fontWeight="$semibold">
                  {p.title || p.productName}
                </Text>
                {p.storeName ? (
                  <Text fontSize="$2xs" color="$textLight500">
                    {p.storeName}
                  </Text>
                ) : null}
              </Box>
            ))}
          </VStack>
        )}

        <Button size="md" mt="$6" variant="outline" borderColor="$error600" onPress={() => void logout()}>
          <ButtonText color="$error600">{strings.logout}</ButtonText>
        </Button>
      </ScrollView>
    </Box>
  );
}
