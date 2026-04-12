/**
 * Logs para depurar la subida de promociones (Upload promotion → POST /api/promotions).
 * En __DEV__: trazas completas. En release: solo advertencias en fallos (visibles en adb logcat).
 */
const PREFIX = '[UploadPromotion]';

export function logPromotionDebug(message: string, data?: Record<string, unknown>): void {
  if (!__DEV__) return;
  if (data && Object.keys(data).length > 0) {
    console.log(PREFIX, message, data);
  } else {
    console.log(PREFIX, message);
  }
}

export function logPromotionWarn(message: string, data?: Record<string, unknown>): void {
  if (data && Object.keys(data).length > 0) {
    console.warn(PREFIX, message, data);
  } else {
    console.warn(PREFIX, message);
  }
}

/** Evita logs enormes (p. ej. base64). */
export function truncateForLog(s: string, max = 400): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… (${s.length} chars)`;
}
