import React from 'react';
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSettings } from '../context/SettingsContext';

type Props = {
  children: React.ReactNode;
  /** Capa sobre la foto (0–1). Por defecto ligera para leer el menú. */
  overlayOpacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fondo de imagen compartido (Home, drawer lateral, paneles inferiores en Social Layer).
 * La URI viene de Ajustes → Fondo de la app.
 */
export default function AppMenuBackground({
  children,
  overlayOpacity = 0.88,
  style,
}: Props) {
  const { appBackgroundUri } = useSettings();

  return (
    <ImageBackground
      source={{ uri: appBackgroundUri }}
      style={[styles.bg, style]}
      resizeMode="cover"
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: `rgba(255,255,255,${overlayOpacity})` },
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1 },
});
