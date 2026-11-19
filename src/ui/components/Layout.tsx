import { Outlet } from 'react-router-dom';
import { useInstallPrompt } from '../../app/useInstallPrompt';
import { BottomNav } from './BottomNav';
import { InstallBanner } from './InstallBanner';
import styles from './Layout.module.css';

export function Layout() {
  const installPrompt = useInstallPrompt();
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <div className={styles.install}>
        <InstallBanner {...installPrompt} />
      </div>
      <BottomNav />
    </div>
  );
}
