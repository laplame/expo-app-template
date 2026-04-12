/**
 * Convierte códigos HTTP (p. ej. 502 Bad Gateway) en texto útil para el usuario.
 * 502/503/504 suelen indicar proxy/backend caído o en mantenimiento, no un fallo de la app.
 */
function isGenericServerMessage(msg: string, status: number): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return true;
  if (t === String(status)) return true;
  if (t === `http ${status}`) return true;
  if (/^bad gateway|gateway timeout|service unavailable/i.test(t)) return false;
  return /^http\s*\d{3}$/i.test(msg.trim());
}

export function formatHttpApiError(httpStatus: number, serverMessage?: string | null): string {
  const raw = (serverMessage ?? '').trim();
  if (raw && !isGenericServerMessage(raw, httpStatus)) {
    return raw;
  }

  if (httpStatus === 502 || httpStatus === 503 || httpStatus === 504) {
    return 'Servidor no disponible (502/503/504). El sitio o la API pueden estar en mantenimiento o saturados; inténtalo en unos minutos.';
  }
  if (httpStatus >= 500) {
    return `Error del servidor (${httpStatus}). Inténtalo más tarde.`;
  }
  if (httpStatus === 408) {
    return 'Tiempo de espera agotado. Reintenta.';
  }
  return raw || `HTTP ${httpStatus}`;
}
