import { useThemePref } from '../../../app/theme';
import type { ThemePref } from '../../../domain/theme';
import styles from './SettingsScreen.module.css';

const OPTIONS: { value: ThemePref; label: string; hint: string }[] = [
  { value: 'system', label: 'Match system', hint: 'Follows your device setting' },
  { value: 'day', label: 'Daylight', hint: 'Undyed wool and lamplit oak' },
  { value: 'night', label: 'Peat fire', hint: 'Embers on dark peat' },
];

export function SettingsScreen() {
  const [pref, setPref] = useThemePref();
  return (
    <>
      <h1>Settings</h1>
      <fieldset className={styles.group}>
        <legend>Theme</legend>
        {OPTIONS.map((o) => (
          <label key={o.value} className={styles.option}>
            <input
              type="radio"
              name="theme"
              id={`theme-${o.value}`}
              value={o.value}
              checked={pref === o.value}
              onChange={() => void setPref(o.value)}
            />
            <span>
              <b>{o.label}</b>
              <small>{o.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </>
  );
}
