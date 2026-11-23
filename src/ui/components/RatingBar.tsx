import { useState } from 'react';
import type { Rating } from '../../domain/types';
import styles from './RatingBar.module.css';

export type SelfRating = Exclude<Rating, 'again'>;

interface Props {
  /** Interval shown under Good, e.g. "4 days". */
  interval: string;
  /** Pre-selected button: Good normally, Hard after an accent-only slip. */
  pre?: 'good' | 'hard';
  onRate: (rating: SelfRating) => void;
}

export function RatingBar({ interval, pre = 'good', onRate }: Props) {
  const [picked, setPicked] = useState<SelfRating>(pre);
  const buttons: { rating: SelfRating; label: string; hint: string }[] = [
    { rating: 'hard', label: 'Hard', hint: 'sooner' },
    { rating: 'good', label: 'Good', hint: interval },
    { rating: 'easy', label: 'Easy', hint: 'later' },
  ];
  return (
    <div className={styles.grid} role="group" aria-label="How did that feel?">
      {buttons.map((b) => (
        <button
          key={b.rating}
          type="button"
          aria-pressed={picked === b.rating}
          className={`${styles.btn} ${picked === b.rating ? styles.on : ''}`}
          onClick={() => {
            setPicked(b.rating);
            onRate(b.rating);
          }}
        >
          <span>{b.label}</span>
          <span className={styles.hint}>{b.hint}</span>
        </button>
      ))}
    </div>
  );
}
