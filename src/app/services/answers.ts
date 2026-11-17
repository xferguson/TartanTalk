import { checkAnswer, type AnswerVerdict } from '../../domain/answer';
import type { Exercise } from '../../domain/exercises';
import type { Rating } from '../../domain/types';

export interface ExerciseCheck {
  verdict: AnswerVerdict;
  /** Correct, or near enough (accents only) to count. */
  correct: boolean;
  /** The accepted Gaelic or English answer, to show when the learner missed. */
  matched: string;
  nudge?: string;
  /** Best rating the learner may give; set after an accent slip. */
  maxRating?: 'hard';
}

/**
 * Marks a response. Choice exercises take the chosen option's text; typed
 * exercises take what was typed.
 */
export function checkExercise(exercise: Exercise, response: string): ExerciseCheck {
  if (exercise.type === 'produce') {
    const r = checkAnswer(exercise.answer, response, exercise.altAnswers);
    return { verdict: r.verdict, correct: r.verdict !== 'wrong', matched: r.matched, nudge: r.nudge, maxRating: r.maxRating };
  }
  const right = exercise.options.find((o) => o.correct)?.text ?? '';
  const correct = exercise.options.some((o) => o.correct && o.text === response);
  return { verdict: correct ? 'correct' : 'wrong', correct, matched: right };
}

/** The rating a review starts on: Again for a miss, Hard after an accent slip, else Good. */
export function defaultRating(check: ExerciseCheck): Rating {
  if (!check.correct) return 'again';
  return check.maxRating ?? 'good';
}

/** An accent slip can never be rated above Hard. */
export function capRating(rating: Rating, check: ExerciseCheck): Rating {
  if (!check.correct) return 'again';
  if (check.maxRating && (rating === 'good' || rating === 'easy')) return check.maxRating;
  return rating;
}
