import React from 'react';
import {
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  visible: boolean;
  bottom: number;
  backgroundUri: string;
  /** Oscurece la foto para legibilidad del texto. */
  overlayOpacity?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export default function CollapsibleBottomPanel({
  visible,
  bottom,
  backgroundUri,
  overlayOpacity = 0.72,
  style,
  children,
}: Props) {
  if (!visible) return null;

  return (
    <ImageBackground
      source={{ uri: backgroundUri }}
      style={[styles.shell, { bottom }, style]}
      resizeMode="cover"
      imageStyle={styles.image}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: `rgba(0,0,0,${overlayOpacity})` },
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  image: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  overlay: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
});
