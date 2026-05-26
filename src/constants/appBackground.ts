/** Misma imagen que Home (Unsplash). */
export const DEFAULT_APP_BACKGROUND_URI =
  'https://images.unsplash.com/photo-1770576568718-6747e3d85de8?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export type AppBackgroundPreset = {
  id: string;
  uri: string;
  labelEs: string;
  labelEn: string;
};

export const APP_BACKGROUND_PRESETS: AppBackgroundPreset[] = [
  {
    id: 'home',
    uri: DEFAULT_APP_BACKGROUND_URI,
    labelEs: 'Inicio (predeterminado)',
    labelEn: 'Home (default)',
  },
  {
    id: 'city',
    uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1287&auto=format&fit=crop',
    labelEs: 'Ciudad',
    labelEn: 'City',
  },
  {
    id: 'nature',
    uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1287&auto=format&fit=crop',
    labelEs: 'Naturaleza',
    labelEn: 'Nature',
  },
];

export function normalizeAppBackgroundUri(raw: string | null | undefined): string {
  const u = (raw ?? '').trim();
  if (!u) return DEFAULT_APP_BACKGROUND_URI;
  if (/^https?:\/\//i.test(u)) return u;
  return DEFAULT_APP_BACKGROUND_URI;
}
