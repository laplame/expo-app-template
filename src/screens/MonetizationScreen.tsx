/**
 * Monetización: panel del influencer + registro de nuevos creadores (pestañas).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Box, Text, VStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import type { InfluencerPlatform } from '../services/influencersApi';
import InfluencerIdentityScreen from './InfluencerIdentityScreen';
import InfluencerSearchScreen from './InfluencerSearchScreen';

export type MonetizationTab = 'panel' | 'register';

export default function MonetizationScreen() {
  const { language } = useSettings();
  const { brand, colors: themeColors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'Monetization'>>();
  const initialTab = route.params?.tab ?? 'panel';

  const [tab, setTab] = useState<MonetizationTab>(initialTab);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: 'Monetización',
            subtitle:
              'Gestiona tu panel en DameCodigo, promociones, deals y redenciones, o registra un nuevo influencer.',
            tabPanel: 'Mi panel',
            tabRegister: 'Registrar creador',
          }
        : {
            title: 'Monetization',
            subtitle:
              'Manage your DameCodigo panel, promotions, deals, and redemptions, or register a new influencer.',
            tabPanel: 'My panel',
            tabRegister: 'Register creator',
          },
    [language]
  );

  const goRegister = useCallback(() => setTab('register'), []);

  return (
    <Box flex={1} bg={themeColors.bg}>
      <StatusBar style="dark" />
      <Box
        px="$4"
        pt={Math.max(insets.top, 8)}
        pb="$2"
        bg={brand}
        borderBottomLeftRadius="$2xl"
        borderBottomRightRadius="$2xl"
      >
        <Text fontSize="$xl" fontWeight="$bold" color="$white">
          {strings.title}
        </Text>
        <Text fontSize="$sm" color="$white" opacity={0.92} mt="$1" lineHeight="$md">
          {strings.subtitle}
        </Text>
        <VStack space="xs" mt="$3">
          <SegmentTab
            label={strings.tabPanel}
            active={tab === 'panel'}
            brand={brand}
            onPress={() => setTab('panel')}
          />
          <SegmentTab
            label={strings.tabRegister}
            active={tab === 'register'}
            brand={brand}
            onPress={() => setTab('register')}
          />
        </VStack>
      </Box>

      <Box flex={1}>
        {tab === 'panel' ? (
          <InfluencerIdentityScreen embedded onGoRegister={goRegister} />
        ) : (
          <InfluencerSearchScreen
            embedded
            initialQuery={route.params?.initialQuery}
            platform={route.params?.platform}
            imageUri={route.params?.imageUri}
          />
        )}
      </Box>
    </Box>
  );
}

function SegmentTab({
  label,
  active,
  brand,
  onPress,
}: {
  label: string;
  active: boolean;
  brand: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, active && styles.segmentActive]}
    >
      <Text
        fontSize="$sm"
        fontWeight="$semibold"
        color={active ? brand : '$white'}
        opacity={active ? 1 : 0.92}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  segmentActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
});
