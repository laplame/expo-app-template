/** Origen del sitio (sin /api) para rutas /uploads/... */
export function getApiOrigin(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const rawBase = (env || 'https://www.damecodigo.com/api').replace(/\/$/, '');
  const withWww = rawBase.replace(/^https:\/\/damecodigo\.com(?=\/|$)/i, 'https://www.damecodigo.com');
  return withWww.replace(/\/api\/?$/, '');
}

/** Convierte `/uploads/...` en URL absoluta. */
export function resolveUploadUrl(url: string | undefined | null): string | undefined {
  if (!url?.trim()) return undefined;
  const t = url.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const base = getApiOrigin();
  return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}
