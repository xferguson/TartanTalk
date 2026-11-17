import type { FsrsState, ItemId, Progress, Sentence } from './types';

/** Weights live here, in one place, because PRD says they need tuning against real use. */
export const CLOZE_OTHER_WEIGHT = 0.25;
export const CLOZE_RETRIEVABILITY_CEILING = 0.9;

/**
 * Scheduler functions are injected so this module never imports W1-D.
 * `goodStability` is the stability an explicit Good review would produce now.
 */
export interface CreditScheduler {
  retrievability(fsrs: FsrsState, now: number): number;
  goodStability(fsrs: FsrsState, now: number): number;
}

export type CreditSource =
  | { exercise: 'produce'; sentence: Sentence }
  | { exercise: 'cloze'; sentence: Sentence; targetId: ItemId };

export interface ImplicitCredit {
  itemId: ItemId;
  /** 1 for a typed sentence, CLOZE_OTHER_WEIGHT for a cloze bystander. */
  weight: number;
  /** New stability: moved `weight` of the way to the Good outcome, never lower than before. */
  stability: number;
}

/**
 * Implicit credit from a correct sentence answer. Positive-only: callers only
 * invoke this after a correct answer, and stability never decreases. Only items
 * already in FSRS review can receive credit; unseen items are not "reviewed".
 */
export function implicitCredit(
  source: CreditSource,
  progress: ReadonlyMap<ItemId, Progress>,
  now: number,
  scheduler: CreditScheduler,
): ImplicitCredit[] {
  const isCloze = source.exercise === 'cloze';
  const weight = isCloze ? CLOZE_OTHER_WEIGHT : 1;
  const seen = new Set<ItemId>();
  const out: ImplicitCredit[] = [];

  for (const token of source.sentence.tokens) {
    const id = token.itemId;
    if (id === null || seen.has(id)) continue;
    seen.add(id);
    if (isCloze && id === source.targetId) continue; // the target is reviewed explicitly

    const fsrs = progress.get(id)?.fsrs;
    if (!fsrs) continue;
    if (isCloze && scheduler.retrievability(fsrs, now) >= CLOZE_RETRIEVABILITY_CEILING) continue;

    const good = scheduler.goodStability(fsrs, now);
    const stability = Math.max(fsrs.stability, fsrs.stability + weight * (good - fsrs.stability));
    out.push({ itemId: id, weight, stability });
  }
  return out;
}
