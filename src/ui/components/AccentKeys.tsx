import type { RefObject } from 'react';
import styles from './AccentKeys.module.css';

export const ACCENTS = ['à', 'è', 'ì', 'ò', 'ù'] as const;

/** Inserts `char` at the input's cursor and fires a bubbling input event so controlled inputs update. */
export function insertAtCursor(input: HTMLInputElement, char: string): void {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.setRangeText(char, start, end, 'end');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

export function AccentKeys({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <div className={styles.row} role="group" aria-label="Accented letters">
      {ACCENTS.map((c) => (
        <button
          key={c}
          type="button"
          lang="gd"
          className={styles.key}
          aria-label={`Insert ${c}`}
          // Keeps focus (and the mobile keyboard) in the input.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => inputRef.current && insertAtCursor(inputRef.current, c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
