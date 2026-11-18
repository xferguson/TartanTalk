import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';
import { NavIcon, type NavIconName } from './BottomNavIcons';

const ITEMS: { to: string; label: string; icon: NavIconName; end: boolean }[] = [
  { to: '/', label: 'Shelf', icon: 'shelf', end: true },
  { to: '/loom', label: 'Loom', icon: 'loom', end: false },
  { to: '/tangles', label: 'Tangles', icon: 'tangles', end: false },
  { to: '/library', label: 'Library', icon: 'library', end: false },
  { to: '/settings', label: 'Settings', icon: 'settings', end: false },
];

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Main">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          <span className={styles.indicator}>
            <NavIcon name={item.icon} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
