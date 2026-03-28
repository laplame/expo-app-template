import React from 'react';
import { MetaMaskProvider } from '@metamask/sdk-react-native';
import { MetaMaskUnavailableProvider } from '../context/MetaMaskUnavailableContext';

const metamaskDappMetadata = {
  name: 'Link4Deal',
  url: 'https://damecodigo.com',
  iconUrl: 'https://damecodigo.com/favicon.png',
  scheme: 'link4deal',
};

interface MetaMaskErrorBoundaryProps {
  children: React.ReactNode;
}

interface MetaMaskErrorBoundaryState {
  hasError: boolean;
}

/**
 * Si MetaMaskProvider o el SDK fallan (p. ej. en Expo Go), capturamos el error
 * y renderizamos la app sin el provider; la sección de direcciones sigue
 * funcionando con "Añadir dirección manual" y listado.
 */
export default class MetaMaskErrorBoundary extends React.Component<
  MetaMaskErrorBoundaryProps,
  MetaMaskErrorBoundaryState
> {
  state: MetaMaskErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MetaMaskErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.warn('[MetaMaskErrorBoundary] MetaMask SDK failed, running without provider:', error?.message ?? error, errorInfo?.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <MetaMaskUnavailableProvider value={true}>
          {this.props.children}
        </MetaMaskUnavailableProvider>
      );
    }
    return (
      <MetaMaskProvider sdkOptions={{ dappMetadata: metamaskDappMetadata }}>
        <MetaMaskUnavailableProvider value={false}>
          {this.props.children}
        </MetaMaskUnavailableProvider>
      </MetaMaskProvider>
    );
  }
}
