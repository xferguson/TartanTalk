import styles from './ProgressBar.module.css';

interface Props { value: number; max: number; label: string }

export function ProgressBar({ value, max, label }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={styles.track} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className={styles.fill} style={{ width: `${pct}%` }} />
    </div>
  );
}
