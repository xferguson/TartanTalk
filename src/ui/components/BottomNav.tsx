import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const ITEMS = [
  { to: '/', label: 'Shelf', end: true },
  { to: '/loom', label: 'Loom', end: false },
  { to: '/tangles', label: 'Tangles', end: false },
  { to: '/library', label: 'Library', end: false },
  { to: '/settings', label: 'Settings', end: false },
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
          <span className={styles.dot} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
