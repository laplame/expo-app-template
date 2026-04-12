import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { SettingsProvider } from './src/context/SettingsContext';
import { VerificationAccessProvider } from './src/context/VerificationAccessContext';
import { WalletDisclosureProvider } from './src/context/WalletDisclosureContext';
import { WalletBalanceProvider } from './src/context/WalletBalanceContext';
import AppNavigator from './src/navigation/AppNavigator';
import MetaMaskErrorBoundary from './src/components/MetaMaskErrorBoundary';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <SafeAreaProvider>
        <MetaMaskErrorBoundary>
          <SettingsProvider>
            <VerificationAccessProvider>
              <WalletDisclosureProvider>
                <WalletBalanceProvider>
                  <AppNavigator />
                </WalletBalanceProvider>
              </WalletDisclosureProvider>
            </VerificationAccessProvider>
          </SettingsProvider>
        </MetaMaskErrorBoundary>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
