import 'react-native-gesture-handler';
import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { SettingsProvider } from './src/context/SettingsContext';
import { WalletDisclosureProvider } from './src/context/WalletDisclosureContext';
import { WalletBalanceProvider } from './src/context/WalletBalanceContext';
import AppNavigator from './src/navigation/AppNavigator';
import MetaMaskErrorBoundary from './src/components/MetaMaskErrorBoundary';

export default function App() {
  return (
    <GluestackUIProvider config={config}>
      <MetaMaskErrorBoundary>
        <SettingsProvider>
          <WalletDisclosureProvider>
            <WalletBalanceProvider>
              <AppNavigator />
            </WalletBalanceProvider>
          </WalletDisclosureProvider>
        </SettingsProvider>
      </MetaMaskErrorBoundary>
    </GluestackUIProvider>
  );
}
