export const DEFAULT_APP_THEME_ID = 'gold' as const;

export type AppThemeId =
  | 'gold'
  | 'dark'
  | 'light'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'violet'
  | 'midnight';

export type AppThemeColors = {
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  elevated: string;
};

export type AppThemeDefinition = {
  id: AppThemeId;
  labelEs: string;
  labelEn: string;
  /** Color de muestra en Ajustes */
  preview: string;
  /** Cabecera drawer / marca */
  brand: string;
  isDark: boolean;
  colors: AppThemeColors;
};

const DARK_BASE: AppThemeColors = {
  bg: '#000000',
  surface: '#0c0c0c',
  line: '#1c1c1c',
  text: '#f2f2f2',
  muted: '#7a7a7a',
  accent: '#1d9bf0',
  elevated: '#111111',
};

export const APP_THEMES: AppThemeDefinition[] = [
  {
    id: 'gold',
    labelEs: 'Dorado',
    labelEn: 'Gold',
    preview: '#C4A574',
    brand: '#A67C52',
    isDark: false,
    colors: {
      bg: '#F5F0E6',
      surface: '#FFFBF5',
      line: '#D4C4A8',
      text: '#3D3428',
      muted: '#8B7355',
      accent: '#C9A227',
      elevated: '#E8DFCF',
    },
  },
  {
    id: 'dark',
    labelEs: 'Oscuro',
    labelEn: 'Dark',
    preview: '#1c1c1c',
    brand: '#00704A',
    isDark: true,
    colors: DARK_BASE,
  },
  {
    id: 'light',
    labelEs: 'Claro',
    labelEn: 'Light',
    preview: '#f2f2f4',
    brand: '#00704A',
    isDark: false,
    colors: {
      bg: '#f2f2f4',
      surface: '#ffffff',
      line: '#d8d8de',
      text: '#0f0f0f',
      muted: '#5c5c66',
      accent: '#1d9bf0',
      elevated: '#ebebef',
    },
  },
  {
    id: 'forest',
    labelEs: 'Bosque',
    labelEn: 'Forest',
    preview: '#1b4332',
    brand: '#2d6a4f',
    isDark: true,
    colors: {
      bg: '#0a1410',
      surface: '#0f1f18',
      line: '#1e3d2f',
      text: '#e8f5e9',
      muted: '#81c784',
      accent: '#52b788',
      elevated: '#143728',
    },
  },
  {
    id: 'ocean',
    labelEs: 'Océano',
    labelEn: 'Ocean',
    preview: '#0077b6',
    brand: '#023e8a',
    isDark: true,
    colors: {
      bg: '#030f1a',
      surface: '#051829',
      line: '#0d3b66',
      text: '#e3f2fd',
      muted: '#90caf9',
      accent: '#00b4d8',
      elevated: '#0a2540',
    },
  },
  {
    id: 'sunset',
    labelEs: 'Atardecer',
    labelEn: 'Sunset',
    preview: '#ff6b35',
    brand: '#c2410c',
    isDark: false,
    colors: {
      bg: '#fff8f3',
      surface: '#ffffff',
      line: '#fed7aa',
      text: '#431407',
      muted: '#9a3412',
      accent: '#ea580c',
      elevated: '#ffedd5',
    },
  },
  {
    id: 'violet',
    labelEs: 'Violeta',
    labelEn: 'Violet',
    preview: '#7c3aed',
    brand: '#5b21b6',
    isDark: true,
    colors: {
      bg: '#0f0a1a',
      surface: '#1a1228',
      line: '#3b2667',
      text: '#f3e8ff',
      muted: '#c4b5fd',
      accent: '#a78bfa',
      elevated: '#251a38',
    },
  },
  {
    id: 'midnight',
    labelEs: 'Medianoche',
    labelEn: 'Midnight',
    preview: '#1e293b',
    brand: '#334155',
    isDark: true,
    colors: {
      bg: '#0f172a',
      surface: '#1e293b',
      line: '#334155',
      text: '#f1f5f9',
      muted: '#94a3b8',
      accent: '#38bdf8',
      elevated: '#273449',
    },
  },
];

const THEME_MAP = new Map(APP_THEMES.map((t) => [t.id, t]));

export function isValidAppTheme(value: string): value is AppThemeId {
  return THEME_MAP.has(value as AppThemeId);
}

export function normalizeAppTheme(value: string | null | undefined): AppThemeId {
  if (value && isValidAppTheme(value)) return value;
  return DEFAULT_APP_THEME_ID;
}

export function getAppTheme(id: AppThemeId): AppThemeDefinition {
  return THEME_MAP.get(id) ?? THEME_MAP.get(DEFAULT_APP_THEME_ID)!;
}

export function getAppThemeColors(id: AppThemeId): AppThemeColors {
  return getAppTheme(id).colors;
}

export function getAppThemeLabel(id: AppThemeId, lang: 'es' | 'en'): string {
  const t = getAppTheme(id);
  return lang === 'es' ? t.labelEs : t.labelEn;
}
