import type { InstallPrompt } from '../../app/useInstallPrompt';
import styles from './InstallBanner.module.css';

/** Presentational: the hook decides *whether* to show it, this decides how it looks. */
export function InstallBanner({ mode, install, dismiss }: InstallPrompt) {
  if (mode === null) return null;
  return (
    <section className={styles.banner} role="region" aria-label="Install Tartan Talk">
      <h2 className={styles.title}>Take Tartan Talk with you</h2>
      <p className={styles.body}>
        {mode === 'native'
          ? 'Install it to open from your home screen and weave offline.'
          : 'Tap Share, then Add to Home Screen.'}
      </p>
      <div className={styles.actions}>
        {mode === 'native' && (
          <button type="button" className={styles.primary} onClick={() => void install()}>
            Install
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={dismiss}>
          Not now
        </button>
      </div>
    </section>
  );
}
