import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
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

/**
 * The learner's theme preference. Changes apply immediately (optimistic) and are
 * persisted to IndexedDB; the stored value wins once it loads.
 */
export function useThemePref(): [ThemePref, (pref: ThemePref) => Promise<void>] {
  const stored = useLiveQuery(() => db.settings.get('theme'), []);
  const [pending, setPending] = useState<ThemePref | null>(null);
  const storedPref: ThemePref = isThemePref(stored?.value) ? stored.value : 'system';
  const pref = pending ?? storedPref;

  useEffect(() => {
    if (pending !== null || stored !== undefined) applyTheme(pref);
  }, [pref, pending, stored]);

  // Drop the optimistic value once the stored one has caught up, so there is no flicker.
  useEffect(() => {
    if (pending !== null && storedPref === pending) setPending(null);
  }, [pending, storedPref]);

  const update = async (next: ThemePref) => {
    setPending(next);
    await setSetting('theme', next);
  };
  return [pref, update];
}
