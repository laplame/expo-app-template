import {
  getAppThemeColors,
  type AppThemeColors,
  type AppThemeId,
} from './appThemes';

/** @deprecated Use AppThemeId */
export type ColorScheme = AppThemeId;

export type SocialLayerColors = AppThemeColors;

export function getSocialLayerColors(themeId: AppThemeId): SocialLayerColors {
  return getAppThemeColors(themeId);
}
