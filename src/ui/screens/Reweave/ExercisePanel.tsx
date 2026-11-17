import { useRef, useState, type FormEvent } from 'react';
import type { Exercise } from '../../../domain/exercises';
import type { Feedback } from '../../../app/store/sessionStore';
import { AccentKeys } from '../../components/AccentKeys';
import styles from './ExercisePanel.module.css';

const LABELS: Record<Exercise['type'], string> = {
  recognise: 'Choose the meaning',
  cloze: 'Fill the gap',
  produce: 'Type the Gaelic',
};

interface Props {
  exercise: Exercise;
  feedback: Feedback | null;
  onSubmit: (response: string) => void;
  /** Marks the right option with a tick once answered (the reweave layout). */
  showCorrect?: boolean;
}

/** One question in the shared Loom / Reweave pattern (spec B6). */
export function ExercisePanel({ exercise, feedback, onSubmit, showCorrect = true }: Props) {
  const answered = feedback !== null;
  return (
    <div className={styles.panel}>
      <p className={styles.label}>{LABELS[exercise.type]}</p>
      {exercise.type === 'recognise' && (
        <>
          <p className={styles.prompt} lang="gd">{exercise.prompt}</p>
          <Options exercise={exercise} answered={answered} onSubmit={onSubmit} showCorrect={showCorrect} gaelic={false} />
        </>
      )}
      {exercise.type === 'cloze' && (
        <>
          <p className={styles.prompt} lang="gd">
            {exercise.tokens.map((t, i) =>
              t === null ? <span key={i} className={styles.gap} aria-label="blank" /> : <span key={i}>{i > 0 ? ' ' : ''}{t}</span>,
            )}
          </p>
          <p className={styles.hint}>{exercise.translation}</p>
          <Options exercise={exercise} answered={answered} onSubmit={onSubmit} showCorrect={showCorrect} gaelic />
        </>
      )}
      {exercise.type === 'produce' && <Typed key={exercise.itemId} prompt={exercise.prompt} answered={answered} onSubmit={onSubmit} />}
      {feedback && <FeedbackLine feedback={feedback} answer={feedback.check.matched} />}
    </div>
  );
}

function Options({
  exercise,
  answered,
  onSubmit,
  showCorrect,
  gaelic,
}: {
  exercise: Extract<Exercise, { options: unknown }>;
  answered: boolean;
  onSubmit: (r: string) => void;
  showCorrect: boolean;
  gaelic: boolean;
}) {
  return (
    <div className={styles.options}>
      {exercise.options.map((o) => {
        const right = answered && showCorrect && o.correct;
        return (
          <button
            key={o.text}
            type="button"
            className={`${styles.option} ${right ? styles.right : ''}`}
            disabled={answered}
            lang={gaelic ? 'gd' : undefined}
            onClick={() => onSubmit(o.text)}
          >
            {o.text}
            {right && <span aria-hidden="true"> ✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function Typed({ prompt, answered, onSubmit }: { prompt: string; answered: boolean; onSubmit: (r: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!answered && value.trim()) onSubmit(value);
  };
  return (
    <form onSubmit={submit} className={styles.form}>
      <p className={styles.prompt}>{prompt}</p>
      <input
        ref={ref}
        className={`${styles.input} ${answered ? styles.inputFeedback : ''}`}
        lang="gd"
        aria-label="Your answer in Gaelic"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        readOnly={answered}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {!answered && <AccentKeys inputRef={ref} />}
      {!answered && (
        <button type="submit" className={styles.check}>
          Check
        </button>
      )}
    </form>
  );
}

function FeedbackLine({ feedback, answer }: { feedback: Feedback; answer: string }) {
  const { check } = feedback;
  if (check.verdict === 'correct') {
    return <p className={`${styles.feedback} ${styles.ok}`} role="status">Math dhèanta! Well done.</p>;
  }
  if (check.verdict === 'near') {
    return (
      <p className={`${styles.feedback} ${styles.near}`} role="status">
        Almost: it&rsquo;s <strong lang="gd">{answer}</strong>. Mind the accents.
      </p>
    );
  }
  return (
    <p className={`${styles.feedback} ${styles.miss}`} role="status">
      Not quite. It&rsquo;s <strong lang="gd">{answer}</strong>.
    </p>
  );
}
