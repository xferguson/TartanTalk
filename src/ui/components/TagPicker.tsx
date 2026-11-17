import styles from './TagPicker.module.css';

interface Props {
  tags: string[];
  selected?: string[];
  onToggle?: (tag: string) => void;
  /** Names the group for screen readers. */
  label?: string;
}

/** Toggle buttons when `onToggle` is given; otherwise non-interactive chips (scarf detail). */
export function TagPicker({ tags, selected = [], onToggle, label }: Props) {
  if (!onToggle) {
    return (
      <ul className={styles.group} aria-label={label}>
        {tags.map((t) => (
          <li key={t} className={styles.tag}>{t}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {tags.map((t) => {
        const on = selected.includes(t);
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            className={`${styles.tag} ${styles.toggle} ${on ? styles.on : ''}`}
            onClick={() => onToggle(t)}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
