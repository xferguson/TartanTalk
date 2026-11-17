import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db, setSetting } from '../db/db';
import { isThemePref, themeAttribute, type ThemePref } from '../domain/theme';

/** localStorage key read by the inline boot script in index.html to avoid a theme flash. */
export const THEME_HINT_KEY = 'tt-theme';

export function applyTheme(pref: ThemePref): void {
  const attr = themeAttribute(pref);
  if (attr) document.documentElement.dataset.theme = attr;
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(THEME_HINT_KEY, pref);
  } catch {
    // Storage can be unavailable (private mode); the setting still lives in IndexedDB.
  }
}

export function useThemePref(): [ThemePref, (pref: ThemePref) => Promise<void>] {
  const stored = useLiveQuery(() => db.settings.get('theme'), []);
  const pref: ThemePref = isThemePref(stored?.value) ? stored.value : 'system';
  useEffect(() => {
    if (stored !== undefined) applyTheme(pref);
  }, [pref, stored]);
  return [pref, (next) => setSetting('theme', next)];
}
