import { Platform, Share } from 'react-native';
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';

/** Descarga imagen remota al cache y abre el diálogo nativo de compartir. */
export async function shareRemoteImage(
  imageUrl: string,
  options?: { title?: string; message?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!imageUrl.trim()) return { ok: false, error: 'URL vacía' };
  if (!cacheDirectory) {
    try {
      await Share.share({
        message: options?.message
          ? `${options.message}\n${imageUrl}`
          : imageUrl,
        title: options?.title,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Share cancelled' };
    }
  }

  const ext = imageUrl.includes('.webp') ? 'webp' : imageUrl.includes('.jpg') ? 'jpg' : 'png';
  const dest = `${cacheDirectory}story-${Date.now()}.${ext}`;
  try {
    const { uri } = await downloadAsync(imageUrl, dest);
    if (Platform.OS === 'ios') {
      await Share.share({ url: uri, message: options?.message, title: options?.title });
    } else {
      await Share.share({
        message: options?.message ? `${options.message}\n${imageUrl}` : imageUrl,
        url: uri,
        title: options?.title,
      });
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('cancel')) return { ok: false, error: 'Share cancelled' };
    try {
      await Share.share({
        message: options?.message ? `${options.message}\n${imageUrl}` : imageUrl,
        title: options?.title,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: msg || 'Share failed' };
    }
  }
}
