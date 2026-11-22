import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipVariant = 'attention' | 'calm';

export function Chip({ variant, children }: { variant?: ChipVariant; children: ReactNode }) {
  const cls = variant ? `${styles.chip} ${styles[variant]}` : styles.chip;
  return <span className={cls}>{children}</span>;
}
