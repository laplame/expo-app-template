import React, { useState, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet, Share, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCardSocialStrings } from '../i18n/uiStrings';

const ICON_SIZE = 24;
const ICON_COLOR = '#374151';

export interface CardSocialActionsProps {
  language: 'en' | 'es';
  /** Controlado desde fuera (opcional) */
  liked?: boolean;
  /** Si no pasas `liked`, el estado es interno */
  onLikedChange?: (liked: boolean) => void;
  /** Texto / URL para el diálogo nativo de compartir */
  shareMessage?: string;
  shareUrl?: string;
}

/**
 * Barra estilo red social: me gusta (corazón), comentarios, compartir, más (⋯).
 */
export default function CardSocialActions({
  language,
  liked: likedControlled,
  onLikedChange,
  shareMessage,
  shareUrl,
}: CardSocialActionsProps) {
  const [likedInternal, setLikedInternal] = useState(false);
  const liked = likedControlled ?? likedInternal;
  const s = useMemo(() => getCardSocialStrings(language), [language]);

  const onLike = useCallback(() => {
    if (likedControlled !== undefined) {
      onLikedChange?.(!likedControlled);
    } else {
      setLikedInternal((p) => !p);
    }
  }, [likedControlled, onLikedChange]);

  const onComments = useCallback(() => {
    Alert.alert(s.commentsTitle, s.commentsBody, [{ text: s.ok }]);
  }, [s.commentsBody, s.commentsTitle, s.ok]);

  const onShare = useCallback(async () => {
    const msg = shareMessage?.trim() || s.shareDefaultMessage;
    try {
      await Share.share(
        Platform.OS === 'ios' && shareUrl
          ? { message: msg, url: shareUrl }
          : { message: shareUrl ? `${msg}\n${shareUrl}` : msg }
      );
    } catch {
      // cancelado por el usuario
    }
  }, [s.shareDefaultMessage, shareMessage, shareUrl]);

  const onMore = useCallback(() => {
    Alert.alert(s.moreOptionsTitle, undefined, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.report,
        style: 'destructive',
        onPress: () => {},
      },
    ]);
  }, [s.cancel, s.moreOptionsTitle, s.report]);

  return (
    <View style={styles.row}>
      <View style={styles.leftGroup}>
        <Pressable
          onPress={onLike}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={s.accessibilityLike}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={ICON_SIZE}
            color={liked ? '#ef4444' : ICON_COLOR}
          />
        </Pressable>
        <Pressable
          onPress={onComments}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={s.accessibilityComments}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons name="chatbubble-outline" size={ICON_SIZE} color={ICON_COLOR} />
        </Pressable>
        <Pressable
          onPress={onShare}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={s.accessibilityShare}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Ionicons name="share-outline" size={ICON_SIZE} color={ICON_COLOR} />
        </Pressable>
      </View>
      <Pressable
        onPress={onMore}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={s.accessibilityMore}
        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
      >
        <Ionicons name="ellipsis-horizontal" size={ICON_SIZE} color={ICON_COLOR} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  iconBtn: {
    padding: 2,
  },
  pressed: {
    opacity: 0.65,
  },
});
