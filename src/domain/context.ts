/**
 * Context-first learning: a word that has been proven inside a sentence is
 * reviewed through full sentences from then on, never as a bare flashcard.
 * Words that have had a couple of reviews but still never met a sentence are
 * found here so the next learning session can teach them one.
 *
 * Pure: functions take `now` and return new values.
 */
import { isDue } from './scheduler';
import { isLearned, trackedTokens } from './unlock';
import type { ItemId, LearnableItem, Progress, ReviewEvent, Sentence } from './types';

/** Reviews a word may have without a sentence before one is prioritised for it. */
export const SENTENCE_PRIORITY_REPS = 2;
/** Words due within this long of a sentence review join it, so their schedules line up. */
export const SYNC_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const isSentence = (item: LearnableItem | undefined): item is Sentence => item?.kind === 'sentence';

/** Words and forms that appear in a learned sentence: they have been used in context. */
export function wordsInContext(sentences: readonly Sentence[], progress: ReadonlyMap<ItemId, Progress>): Set<ItemId> {
  return new Set(sentences.filter((s) => isLearned(progress.get(s.id))).flatMap(trackedTokens));
}

/** Woven words with a couple of reviews and no sentence yet, most reviewed first. */
export function wordsNeedingSentences(items: readonly LearnableItem[], progress: ReadonlyMap<ItemId, Progress>): ItemId[] {
  const inContext = wordsInContext(items.filter(isSentence), progress);
  return items
    .filter((i) => !isSentence(i) && !inContext.has(i.id))
    .flatMap((i) => {
      const p = progress.get(i.id);
      return p && isLearned(p) && p.fsrs && p.fsrs.reps >= SENTENCE_PRIORITY_REPS ? [{ id: i.id, reps: p.fsrs.reps }] : [];
    })
    .sort((a, b) => b.reps - a.reps || a.id.localeCompare(b.id))
    .map((w) => w.id);
}

/**
 * Words that have passed a sentence cloze in review. This is the ratchet: from
 * here on they are asked as typed full sentences and never as an easier format,
 * even after a miss, because it is read from the log rather than the schedule.
 * Learning never blanks a bare word, so a cloze event for a word is always a review.
 */
export function readyForTyped(events: readonly ReviewEvent[]): Set<ItemId> {
  return new Set(events.filter((e) => !e.implicit && e.exercise === 'cloze' && e.rating !== 'again').map((e) => e.itemId));
}

/** The learned sentence to blank a word in: the one whose last review is oldest, for variety. */
export function carrierFor(wordId: ItemId, sentences: readonly Sentence[], progress: ReadonlyMap<ItemId, Progress>): Sentence | undefined {
  return sentences
    .filter((s) => isLearned(progress.get(s.id)) && trackedTokens(s).includes(wordId))
    .sort((a, b) => (progress.get(a.id)?.fsrs?.lastReview ?? 0) - (progress.get(b.id)?.fsrs?.lastReview ?? 0) || a.id.localeCompare(b.id))[0];
}

/** One review question: the item asked, and every item that is rated with it. */
export interface ReviewUnit {
  itemId: ItemId;
  covers: ItemId[];
}

export interface BundleInput {
  /** Items due now, most overdue first. */
  due: readonly ItemId[];
  items: ReadonlyMap<ItemId, LearnableItem>;
  progress: ReadonlyMap<ItemId, Progress>;
  /** Items that may be pulled in early to sync with a sentence (e.g. one scarf's). */
  scope: ReadonlySet<ItemId>;
  /** Words that have climbed to typed sentences (see `readyForTyped`); only they are bundled. */
  typedReady: ReadonlySet<ItemId>;
  now: number;
  syncWindowMs?: number;
}

/**
 * Groups due words into full-sentence reviews. A word that has climbed to typed
 * sentences is never asked alone: the learned sentence that covers the most due words (then
 * the most words falling due soon) is typed once and rates them all together.
 * Everything else stays a single review.
 */
export function bundleReviews({ due, items, progress, scope, typedReady, now, syncWindowMs = SYNC_WINDOW_MS }: BundleInput): ReviewUnit[] {
  const sentences = [...items.values()].filter(isSentence);
  const learnedSentences = sentences.filter((s) => isLearned(progress.get(s.id)));
  const inContext = wordsInContext(sentences, progress);
  const position = new Map(due.map((id, i) => [id, i]));
  const dueSet = new Set(due);

  const wordsLeft = new Set(due.filter((id) => !isSentence(items.get(id)) && inContext.has(id) && typedReady.has(id)));
  const soon = new Set(
    [...scope].filter((id) => {
      const p = progress.get(id);
      return (
        p !== undefined && !dueSet.has(id) && !p.tangled && inContext.has(id) && typedReady.has(id) && !isSentence(items.get(id)) &&
        p.fsrs !== null && !isDue(p, now) && p.fsrs.due <= now + syncWindowMs
      );
    }),
  );

  const units: ReviewUnit[] = [];
  while (wordsLeft.size > 0) {
    const scored = learnedSentences
      .map((s) => {
        const tokens = [...new Set(trackedTokens(s))];
        return { s, due: tokens.filter((t) => wordsLeft.has(t)), soon: tokens.filter((t) => soon.has(t)) };
      })
      .filter((c) => c.due.length > 0)
      .sort((a, b) => b.due.length - a.due.length || b.soon.length - a.soon.length || a.s.id.localeCompare(b.s.id));
    const best = scored[0];
    if (!best) break; // unreachable while a word is in context, but never loop forever
    const carrierDue = dueSet.has(best.s.id);
    units.push({ itemId: best.s.id, covers: [...best.due, ...best.soon, ...(carrierDue ? [best.s.id] : [])] });
    for (const id of [...best.due, ...best.soon]) {
      wordsLeft.delete(id);
      soon.delete(id);
    }
  }

  const covered = new Set(units.flatMap((u) => u.covers));
  const solo = due.filter((id) => !covered.has(id)).map((id) => ({ itemId: id, covers: [id] }));
  const firstDue = (u: ReviewUnit) => Math.min(...u.covers.map((id) => position.get(id) ?? Infinity));
  return [...units, ...solo].sort((a, b) => firstDue(a) - firstDue(b));
}
