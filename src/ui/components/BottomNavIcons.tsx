import styles from './BottomNav.module.css';

export type NavIconName = 'shelf' | 'loom' | 'tangles' | 'library' | 'settings';

/*
 * Line icons on a 24-unit grid. The `thread` parts are the accent: muted with the rest of
 * the icon when idle, picked out in amber when the room is active, like a coloured weft
 * running through the cloth.
 */
const SHAPES: Record<NavIconName, { base: string[]; thread: string[]; knobs?: [number, number][] }> = {
  // Two folded scarves on a shelf, each with a stripe.
  shelf: {
    base: [
      'M3 20.5H21',
      'M4.5 13.5h15a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-3.5a1 1 0 0 1 1-1Z',
      'M7 7.5h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z',
    ],
    thread: ['M14 13.5v5.5', 'M10 7.5v5'],
  },
  // A weaving shuttle trailing its weft thread.
  loom: {
    base: [
      'M2.99 18.31C4.4 13.35 15.87 5.32 21.01 5.69C19.6 10.65 8.13 18.68 2.99 18.31Z',
      'M8.83 12.7L13.74 9.26A1.25 1.25 0 0 1 15.17 11.3L10.26 14.74A1.25 1.25 0 0 1 8.83 12.7Z',
    ],
    thread: ['M10.36 13.15L13.64 10.85', 'M13 13.5c1 3 3.5 5.5 7.5 6.5'],
  },
  // A thread that has looped back on itself.
  tangles: {
    base: ['M3 20c2 0 3-2 3.5-4.5S8 9 12 9s5 3.5 3 5.5-6 1-5.5-2S13 5 16.5 5 21 8 20 11'],
    thread: ['M20 11c-.75 2.5-2.75 3.5-2.25 6s2.25 3 3.75 3'],
  },
  // A tartan swatch: the sett's crossing stripes.
  library: {
    base: ['M7 3.5h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z', 'M4 15.5h16', 'M15.5 3.5v17'],
    thread: ['M4 9.5h16', 'M9.5 3.5v17'],
  },
  // Sliders: tune the app to suit you.
  settings: {
    base: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
    thread: [],
    knobs: [
      [9, 7],
      [15, 12],
      [8, 17],
    ],
  },
};

export function NavIcon({ name }: { name: NavIconName }) {
  const shape = SHAPES[name];
  return (
    <svg
      className={styles.icon}
      data-icon={name}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape.base.map((d) => (
        <path key={d} d={d} />
      ))}
      {shape.thread.map((d) => (
        <path key={d} d={d} className={styles.thread} />
      ))}
      {shape.knobs?.map(([cx, cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="2.25" className={styles.knob} />
      ))}
    </svg>
  );
}
