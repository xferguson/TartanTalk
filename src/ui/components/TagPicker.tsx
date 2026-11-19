import styles from './TagPicker.module.css';

interface Props {
  tags: string[];
  selected?: string[];
  onToggle?: (tag: string) => void;
  /** Names the group for screen readers. */
  label?: string;
  /** Display text for a tag; the tag itself stays the value. */
  format?: (tag: string) => string;
}

/** Toggle buttons when `onToggle` is given; otherwise non-interactive chips (scarf detail). */
export function TagPicker({ tags, selected = [], onToggle, label, format = (t) => t }: Props) {
  if (!onToggle) {
    return (
      <ul className={styles.group} aria-label={label}>
        {tags.map((t) => (
          <li key={t} className={styles.tag}>{format(t)}</li>
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
            {format(t)}
          </button>
        );
      })}
    </div>
  );
}
