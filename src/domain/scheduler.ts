/**
 * Review scheduling (W1-D).
 *
 * After an item is learned it follows a seeded ladder (1, 4, 16 days) so early
 * behaviour is predictable, then FSRS takes over and adapts to the learner's
 * accuracy. FSRS memory state is updated on every review, including during the
 * seeded steps, so it is well informed when it takes over.
 *
 * Pure: every function takes `now` (epoch ms) and returns new objects.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating as FsrsRating, State, type Card, type Grade } from 'ts-fsrs';
import type { FsrsState, ItemId, Progress, Rating } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const SEEDED_INTERVALS_DAYS = [1, 4, 16] as const;
export const HARD_FACTOR = 0.5;
export const EASY_FACTOR = 1.5;
/**
 * A missed item has no waiting time: it stays due, so its moth hole stays until
 * it is mended. The session asks it again at its end; leaving first loses nothing.
 */
export const RELEARN_DELAY_MS = 0;
export const DEFAULT_RETENTION = 0.9;
/** Consecutive misses that tangle an item. */
export const TANGLE_AFTER_MISSES = 2;

export interface SchedulerOptions {
  /** Desired retention for FSRS, 0..1. */
  retention?: number;
}

const GRADE: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

const engines = new Map<number, ReturnType<typeof fsrs>>();
function engine(retention = DEFAULT_RETENTION) {
  let e = engines.get(retention);
  if (!e) {
    // Fuzz off for determinism; short-term steps off because relearning is handled by the session.
    e = fsrs(generatorParameters({ request_retention: retention, enable_fuzz: false, enable_short_term: false }));
    engines.set(retention, e);
  }
  return e;
}

function toCard(s: FsrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: 0,
    scheduled_days: Math.max(0, Math.round((s.due - s.lastReview) / DAY_MS)),
    reps: s.reps,
    lapses: s.lapses,
    state: s.reps === 0 ? State.New : State.Review,
    last_review: new Date(s.lastReview),
  };
}

function fromCard(card: Card, now: number): FsrsState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    lastReview: now,
    due: card.due.getTime(),
    reps: card.reps,
    lapses: card.lapses,
  };
}

/** FSRS's own view of a review, ignoring the seeded ladder. */
function fsrsReview(state: FsrsState | null, rating: Rating, now: number, opts: SchedulerOptions): FsrsState {
  const card = state ? toCard(state) : createEmptyCard(new Date(now));
  return fromCard(engine(opts.retention).next(card, new Date(now), GRADE[rating]).card, now);
}

export function newProgress(itemId: ItemId): Progress {
  return {
    itemId,
    phase: 'new',
    correctInSession: 0,
    ladderStep: 0,
    seededStep: 0,
    fsrs: null,
    ownerScarfId: null,
    wovenAt: null,
    consecutiveMisses: 0,
    tangled: false,
  };
}

/**
 * The item has passed the learning ladder. It is woven (once, into the scarf
 * that introduced it) and its first review is one day out. Relearning a
 * tangled item clears the tangle but keeps the original weave and owner.
 */
export function markLearned(progress: Progress, now: number, scarfId: string, opts: SchedulerOptions = {}): Progress {
  const fsrsState = progress.fsrs ?? fsrsReview(null, 'good', now, opts);
  return {
    ...progress,
    phase: 'review',
    correctInSession: 0,
    ladderStep: 0,
    // The 1-day interval is used now, so the next review answer uses the 4-day step.
    seededStep: 1,
    fsrs: { ...fsrsState, lastReview: now, due: now + SEEDED_INTERVALS_DAYS[0] * DAY_MS },
    ownerScarfId: progress.ownerScarfId ?? scarfId,
    wovenAt: progress.wovenAt ?? now,
    consecutiveMisses: 0,
    tangled: false,
  };
}

function seededIntervalMs(step: number, rating: Exclude<Rating, 'again'>): number {
  const factor = rating === 'hard' ? HARD_FACTOR : rating === 'easy' ? EASY_FACTOR : 1;
  return SEEDED_INTERVALS_DAYS[step] * factor * DAY_MS;
}

/** Applies a review answer. A wrong answer is always `again`. */
export function review(progress: Progress, rating: Rating, now: number, opts: SchedulerOptions = {}): Progress {
  const updated = fsrsReview(progress.fsrs, rating, now, opts);

  if (rating === 'again') {
    const misses = progress.consecutiveMisses + 1;
    const tangled = progress.tangled || misses >= TANGLE_AFTER_MISSES;
    return {
      ...progress,
      phase: tangled ? 'learning' : progress.phase,
      ladderStep: tangled ? 0 : progress.ladderStep,
      correctInSession: tangled ? 0 : progress.correctInSession,
      seededStep: 0,
      fsrs: { ...updated, due: now + RELEARN_DELAY_MS },
      consecutiveMisses: misses,
      tangled,
    };
  }

  const seeded = progress.seededStep < SEEDED_INTERVALS_DAYS.length;
  return {
    ...progress,
    seededStep: progress.seededStep + 1,
    fsrs: seeded ? { ...updated, due: now + seededIntervalMs(progress.seededStep, rating) } : updated,
    consecutiveMisses: 0,
  };
}

/** Probability of recall now, 1 for items that have never been scheduled. */
export function retrievability(progress: Progress, now: number, opts: SchedulerOptions = {}): number {
  if (!progress.fsrs) return 1;
  return engine(opts.retention).get_retrievability(toCard(progress.fsrs), new Date(now), false);
}

export function isDue(progress: Progress, now: number): boolean {
  return progress.fsrs !== null && progress.phase === 'review' && progress.fsrs.due <= now;
}

/** Days until the next review if the learner answered with `rating` now (for RatingBar hints). */
export function nextIntervalDays(progress: Progress, rating: Rating, now: number, opts: SchedulerOptions = {}): number {
  return (review(progress, rating, now, opts).fsrs!.due - now) / DAY_MS;
}

/** FSRS stability after a hypothetical review; injected into implicit credit (W1-E). */
export function stabilityAfter(progress: Progress, rating: Rating, now: number, opts: SchedulerOptions = {}): number {
  return fsrsReview(progress.fsrs, rating, now, opts).stability;
}
