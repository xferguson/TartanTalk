export type ThemePref = 'system' | 'day' | 'night';
export type Theme = 'day' | 'night';

export const THEME_PREFS: readonly ThemePref[] = ['system', 'day', 'night'];

export function isThemePref(value: unknown): value is ThemePref {
  return typeof value === 'string' && (THEME_PREFS as readonly string[]).includes(value);
}

/** The theme actually shown, given the learner's preference and the system setting. */
export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'system') return systemDark ? 'night' : 'day';
  return pref;
}

/** Value for the root `data-theme` attribute; null means follow the system. */
export function themeAttribute(pref: ThemePref): 'light' | 'dark' | null {
  if (pref === 'day') return 'light';
  if (pref === 'night') return 'dark';
  return null;
}
