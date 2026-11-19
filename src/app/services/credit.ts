import { appendReview, putProgress } from '../../db/repo';
import { implicitCredit, type CreditScheduler, type ImplicitCredit } from '../../domain/credit';
import type { Exercise } from '../../domain/exercises';
import { retrievability, stabilityAfter } from '../../domain/scheduler';
import type { FsrsState, ItemId, Progress, Sentence } from '../../domain/types';
import type { ServiceDeps } from './types';

/** Adapts the scheduler to the credit module's injected interface. */
function creditScheduler(progress: ReadonlyMap<ItemId, Progress>): CreditScheduler {
  const rowFor = (fsrs: FsrsState) => [...progress.values()].find((p) => p.fsrs === fsrs);
  return {
    retrievability: (fsrs, now) => {
      const row = rowFor(fsrs);
      return row ? retrievability(row, now) : 1;
    },
    goodStability: (fsrs, now) => {
      const row = rowFor(fsrs);
      return row ? stabilityAfter(row, 'good', now) : fsrs.stability;
    },
  };
}

/**
 * After a correct typed sentence or cloze, gives the other words in it partial
 * credit and records it. Positive-only: it never shortens an interval.
 */
export async function applyImplicitCredit(
  deps: ServiceDeps,
  sentence: Sentence,
  exercise: Exercise,
  progress: ReadonlyMap<ItemId, Progress>,
): Promise<ImplicitCredit[]> {
  if (exercise.type === 'recognise') return [];
  const now = deps.clock.now();
  const source =
    exercise.type === 'cloze'
      ? ({ exercise: 'cloze', sentence, targetId: exercise.targetId } as const)
      : ({ exercise: 'produce', sentence } as const);
  const credits = implicitCredit(source, progress, now, creditScheduler(progress));
  for (const c of credits) {
    const row = progress.get(c.itemId);
    if (!row?.fsrs) continue;
    await putProgress({ ...row, fsrs: { ...row.fsrs, stability: c.stability } }, deps.db);
    await appendReview(
      { itemId: c.itemId, at: now, exercise: exercise.type, rating: 'good', implicit: true, weight: c.weight },
      deps.db,
    );
  }
  return credits;
}
