import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getAppTheme, type AppThemeDefinition } from './appThemes';

/** Colores del tema activo (banner, acentos, Social Layer). */
export function useAppTheme(): AppThemeDefinition {
  const { appTheme } = useSettings();
  return useMemo(() => getAppTheme(appTheme), [appTheme]);
}
