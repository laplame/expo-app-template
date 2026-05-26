import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getAppTheme, type AppThemeDefinition } from './appThemes';

export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex.replace('#', '').trim();
  if (raw.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Marca y acentos del tema activo (sustituye el verde #00704A fijo). */
export function useBrandTheme() {
  const { appTheme } = useSettings();
  const theme = useMemo(() => getAppTheme(appTheme), [appTheme]);
  const brand = theme.brand;
  return {
    theme,
    brand,
    accent: theme.colors.accent,
    colors: theme.colors,
    isDark: theme.isDark,
    brandBg: hexToRgba(brand, 0.1),
    brandBorder: hexToRgba(brand, 0.35),
    brandSurface: hexToRgba(brand, 0.14),
  };
}

export type BrandTheme = ReturnType<typeof useBrandTheme> & { theme: AppThemeDefinition };
