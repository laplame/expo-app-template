import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { SettingsProvider } from './src/context/SettingsContext';
import { AuthProvider } from './src/context/AuthContext';
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
            <AuthProvider>
              <VerificationAccessProvider>
                <WalletDisclosureProvider>
                  <WalletBalanceProvider>
                    <AppNavigator />
                  </WalletBalanceProvider>
                </WalletDisclosureProvider>
              </VerificationAccessProvider>
            </AuthProvider>
          </SettingsProvider>
        </MetaMaskErrorBoundary>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}
