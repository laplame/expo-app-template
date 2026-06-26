/**
 * Monetización: registro web o panel influencer según sesión y rol.
 */
import React from 'react';
import { Box } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import { useAuth } from '../context/AuthContext';
import InfluencerSignupLinkPanel from '../components/InfluencerSignupLinkPanel';
import InfluencerIdentityScreen from './InfluencerIdentityScreen';
import RoleGate from '../components/RoleGate';

export default function MonetizationScreen() {
  const { language } = useSettings();
  const { brand, colors: themeColors } = useBrandTheme();
  const { status, hasPermission } = useAuth();

  const showPanel =
    status === 'authenticated' && hasPermission('influencer_dashboard');

  return (
    <Box flex={1} bg={themeColors.bg}>
      <StatusBar style="dark" />
      {showPanel ? (
        <RoleGate permission="influencer_dashboard" showFallback={false}>
          <InfluencerIdentityScreen embedded />
        </RoleGate>
      ) : (
        <InfluencerSignupLinkPanel language={language} brand={brand} active />
      )}
    </Box>
  );
}
