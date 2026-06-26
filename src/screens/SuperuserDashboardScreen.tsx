/**
 * Dashboard superusuario: acceso CRM web y resumen de permisos.
 */
import React, { useMemo } from 'react';
import { ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Box, Text, VStack, Button, ButtonText, HStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import { getSiteOrigin } from '../utils/influencerProfileUrl';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getRoleLabel, getRolePermissions } from '../types/authRoles';
import RoleGate from '../components/RoleGate';

export default function SuperuserDashboardScreen() {
  return (
    <RoleGate permission="admin_crm">
      <SuperuserDashboardContent />
    </RoleGate>
  );
}

function SuperuserDashboardContent() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout, effectiveRole, isDevSession } = useAuth();
  const { language } = useSettings();
  const { brand } = useBrandTheme();
  const insets = useSafeAreaInsets();

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: 'Panel superusuario',
            subtitle: 'Moderación CRM, todos los dashboards y permisos.',
            crm: 'Abrir CRM web (/admin/crm)',
            permissions: 'Permisos activos',
            dashboards: 'Dashboards por rol',
            userDash: 'Panel usuario',
            influencerDash: 'Panel influencer',
            businessDash: 'Panel negocio',
            upload: 'Subir promoción',
            monetization: 'Monetización',
            dev: 'Sesión de desarrollo (mock)',
            logout: 'Cerrar sesión',
          }
        : {
            title: 'Superuser dashboard',
            subtitle: 'CRM moderation, all dashboards and permissions.',
            crm: 'Open web CRM (/admin/crm)',
            permissions: 'Active permissions',
            dashboards: 'Dashboards by role',
            userDash: 'User panel',
            influencerDash: 'Influencer panel',
            businessDash: 'Business panel',
            upload: 'Upload promotion',
            monetization: 'Monetization',
            dev: 'Development session (mock)',
            logout: 'Sign out',
          },
    [language]
  );

  const crmUrl = `${getSiteOrigin()}/admin/crm`;
  const permissions = getRolePermissions(effectiveRole);
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
      >
        <Box bg="#1e293b" borderRadius="$2xl" p="$4" mb="$4">
          <Text fontSize="$xl" fontWeight="$bold" color="$white">
            {strings.title}
          </Text>
          <Text fontSize="$sm" color="$white" opacity={0.92} mt="$2">
            {displayName}
          </Text>
          <Text fontSize="$2xs" color="$white" opacity={0.85} mt="$1">
            {getRoleLabel(effectiveRole, language)}
          </Text>
          {isDevSession ? (
            <Text fontSize="$2xs" color="#fbbf24" mt="$2">
              {strings.dev}
            </Text>
          ) : null}
        </Box>

        <Button size="lg" bg={brand} mb="$4" onPress={() => Linking.openURL(crmUrl)}>
          <ButtonText>{strings.crm}</ButtonText>
        </Button>

        <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
          {strings.permissions}
        </Text>
        <Box bg="$white" borderRadius="$lg" p="$3" mb="$4" borderWidth={1} borderColor="$borderLight200">
          <HStack flexWrap="wrap" space="xs">
            {permissions.map((p) => (
              <Box key={p} bg="#ecfdf5" px="$2" py="$1" borderRadius="$sm" m="$1">
                <Text fontSize="$2xs" color="#047857">
                  {p}
                </Text>
              </Box>
            ))}
          </HStack>
        </Box>

        <Text fontSize="$md" fontWeight="$bold" color={brand} mb="$2">
          {strings.dashboards}
        </Text>
        <VStack space="sm" mb="$4">
          <Button size="md" variant="outline" borderColor={brand} onPress={() => navigation.navigate('UserDashboard')}>
            <ButtonText color={brand}>{strings.userDash}</ButtonText>
          </Button>
          <Button
            size="md"
            variant="outline"
            borderColor={brand}
            onPress={() => navigation.navigate('InfluencerDashboard')}
          >
            <ButtonText color={brand}>{strings.influencerDash}</ButtonText>
          </Button>
          <Button
            size="md"
            variant="outline"
            borderColor={brand}
            onPress={() => navigation.navigate('BusinessDashboard')}
          >
            <ButtonText color={brand}>{strings.businessDash}</ButtonText>
          </Button>
          <Button size="md" variant="outline" borderColor={brand} onPress={() => navigation.navigate('UploadPromotions')}>
            <ButtonText color={brand}>{strings.upload}</ButtonText>
          </Button>
          <Button size="md" variant="outline" borderColor={brand} onPress={() => navigation.navigate('Monetization')}>
            <ButtonText color={brand}>{strings.monetization}</ButtonText>
          </Button>
        </VStack>

        <Button size="md" variant="outline" borderColor="$error600" onPress={() => void logout()}>
          <ButtonText color="$error600">{strings.logout}</ButtonText>
        </Button>
      </ScrollView>
    </Box>
  );
}
