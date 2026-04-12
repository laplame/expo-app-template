import React, { useCallback, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  grantCameraLabel: string;
  cameraDeniedLabel: string;
  onDecodedPubkey: (pubkeyHex: string, rawPayload: string) => void;
  onInvalidPayload?: (raw: string) => void;
  decode: (payload: string) => string | null;
};

export default function NostrFriendQrScanModal({
  visible,
  onClose,
  title,
  grantCameraLabel,
  cameraDeniedLabel,
  onDecodedPubkey,
  onInvalidPayload,
  decode,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanAt = useRef(0);
  const autoAsked = useRef(false);

  React.useEffect(() => {
    if (!visible) return;
    if (!permission) return;
    if (permission.granted) return;
    if (permission.canAskAgain === false) return;
    if (autoAsked.current) return;
    autoAsked.current = true;
    requestPermission();
  }, [visible, permission, requestPermission]);

  const lastInvalidAt = useRef(0);

  const handleScan = useCallback(
    (result: BarcodeScanningResult) => {
      const data = result.data?.trim() ?? '';
      if (!data) return;
      const now = Date.now();
      if (now - lastScanAt.current < 2000) return;
      lastScanAt.current = now;
      const pk = decode(data);
      if (pk) {
        onDecodedPubkey(pk, data);
        onClose();
      } else if (now - lastInvalidAt.current > 2500) {
        lastInvalidAt.current = now;
        onInvalidPayload?.(data);
      }
    },
    [decode, onClose, onDecodedPubkey, onInvalidPayload]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {!permission?.granted ? (
            <>
              <Pressable style={styles.btn} onPress={() => requestPermission()}>
                <Text style={styles.btnText}>{grantCameraLabel}</Text>
              </Pressable>
              {permission && !permission.granted && permission.canAskAgain === false ? (
                <Text style={styles.err}>{cameraDeniedLabel}</Text>
              ) : null}
            </>
          ) : (
            <View
              style={styles.cameraHost}
              collapsable={false}
              renderToHardwareTextureAndroid
            >
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleScan}
                onMountError={(e) => {
                  if (__DEV__) {
                    console.warn('[NostrFriendQrScanModal]', e?.message);
                  }
                }}
              />
            </View>
          )}
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  title: { color: '#eee', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  btn: {
    backgroundColor: '#1d9bf0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
  err: { color: '#f87171', fontSize: 12, marginTop: 10, textAlign: 'center' },
  cameraHost: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
  },
  closeBtn: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 12,
  },
  closeText: { color: '#9ca3af', fontSize: 22 },
});
