import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { Box, Text, VStack, Button, ButtonText } from '@gluestack-ui/themed';
import { getInfluencerAuthUrl } from '../utils/influencerProfileUrl';
import { loadNativeWebViewComponent } from '../utils/nativeWebView';

type Props = {
  language: 'es' | 'en';
  brand: string;
  /** Cuando la pestaña está visible (Monetización). */
  active?: boolean;
};

const NativeWebView = loadNativeWebViewComponent();

export default function InfluencerSignupLinkPanel({ language, brand, active = true }: Props) {
  const authUrl = getInfluencerAuthUrl();
  const [loading, setLoading] = useState(!!NativeWebView);
  const [error, setError] = useState(false);
  const [webKey, setWebKey] = useState(0);
  const browserOpenedRef = useRef(false);

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            loading: 'Cargando…',
            error: 'No se pudo cargar la página. Revisa tu conexión.',
            retry: 'Reintentar',
            browserTitle: 'Registro y verificación',
            browserBody: 'Completa el alta o inicia sesión como creador en DameCodigo.',
            openBrowser: 'Abrir registro / login',
          }
        : {
            loading: 'Loading…',
            error: 'Could not load the page. Check your connection.',
            retry: 'Retry',
            browserTitle: 'Signup and verification',
            browserBody: 'Complete signup or log in as a creator on DameCodigo.',
            openBrowser: 'Open signup / login',
          },
    [language]
  );

  const openAuthPage = useCallback(async () => {
    try {
      const WebBrowser = await import('expo-web-browser');
      await WebBrowser.openBrowserAsync(authUrl, {
        enableBarCollapsing: true,
        showInRecents: true,
      });
    } catch {
      await Linking.openURL(authUrl);
    }
  }, [authUrl]);

  useEffect(() => {
    if (NativeWebView || !active || browserOpenedRef.current) return;
    browserOpenedRef.current = true;
    void openAuthPage();
  }, [active, openAuthPage]);

  if (!NativeWebView) {
    return (
      <Box flex={1} bg="$white" px="$4" py="$6" justifyContent="center">
        <VStack space="md" alignItems="center">
          <Text fontSize="$lg" fontWeight="$bold" color={brand} textAlign="center">
            {strings.browserTitle}
          </Text>
          <Text fontSize="$sm" color="$textLight700" textAlign="center" lineHeight="$md">
            {strings.browserBody}
          </Text>
          <Button size="lg" bg={brand} onPress={() => void openAuthPage()}>
            <ButtonText>{strings.openBrowser}</ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$white">
      {error ? (
        <VStack flex={1} justifyContent="center" alignItems="center" px="$6" space="md">
          <Text fontSize="$sm" color="$textLight700" textAlign="center" lineHeight="$md">
            {strings.error}
          </Text>
          <Button
            size="md"
            bg={brand}
            onPress={() => {
              setError(false);
              setLoading(true);
              setWebKey((k) => k + 1);
            }}
          >
            <ButtonText>{strings.retry}</ButtonText>
          </Button>
        </VStack>
      ) : (
        <>
          <NativeWebView
            key={webKey}
            source={{ uri: authUrl }}
            style={styles.webview}
            onLoadStart={() => {
              setLoading(true);
              setError(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            onHttpError={() => {
              setLoading(false);
              setError(true);
            }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
          />
          {loading ? (
            <Box style={styles.loadingOverlay} justifyContent="center" alignItems="center">
              <ActivityIndicator size="large" color={brand} />
              <Text fontSize="$xs" color="$textLight500" mt="$3">
                {strings.loading}
              </Text>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
});
