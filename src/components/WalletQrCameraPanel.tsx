import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text, Button, ButtonText, VStack } from '@gluestack-ui/themed';
import { useBrandTheme } from '../theme/useBrandTheme';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

export type WalletQrCameraPanelProps = {
  onBarcodeScanned: (result: BarcodeScanningResult) => void;
  grantCameraLabel: string;
  cameraDeniedLabel: string;
};

export default function WalletQrCameraPanel({
  onBarcodeScanned,
  grantCameraLabel,
  cameraDeniedLabel,
}: WalletQrCameraPanelProps) {
  const { brand } = useBrandTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanAt = useRef(0);
  const autoAsked = useRef(false);

  /** Tras cargar el estado de permiso, pedir cámara una vez (Android 13 suele necesitar diálogo explícito). */
  useEffect(() => {
    if (!permission) return;
    if (permission.granted) return;
    if (permission.canAskAgain === false) return;
    if (autoAsked.current) return;
    autoAsked.current = true;
    requestPermission();
  }, [permission, requestPermission]);

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      const now = Date.now();
      if (now - lastScanAt.current < 2000) return;
      lastScanAt.current = now;
      onBarcodeScanned(result);
    },
    [onBarcodeScanned]
  );

  return (
    <VStack space="sm" width="100%" mb="$3">
      {!permission?.granted ? (
        <Button size="sm" bg={brand} onPress={() => requestPermission()}>
          <ButtonText>{grantCameraLabel}</ButtonText>
        </Button>
      ) : (
        <View
          style={styles.cameraHost}
          collapsable={false}
          renderToHardwareTextureAndroid
        >
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerEnabled
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
            onMountError={(e) => {
              if (__DEV__) {
                console.warn('[WalletQrCameraPanel] onMountError', e?.message);
              }
            }}
          />
        </View>
      )}
      {permission && !permission.granted && permission.canAskAgain === false ? (
        <Text fontSize="$xs" color="#B91C1C" textAlign="center">
          {cameraDeniedLabel}
        </Text>
      ) : null}
    </VStack>
  );
}

const styles = StyleSheet.create({
  cameraHost: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
});
