import { appendReview, getProgress, getScarf, putProgress } from '../../db/repo';
import type { ImplicitCredit } from '../../domain/credit';
import { buildCloze, buildProduce, buildRecognise, type Exercise } from '../../domain/exercises';
import { mothHoles, type MothCandidate, type MothResult } from '../../domain/moths';
import { isDue, review } from '../../domain/scheduler';
import type { ItemId, Progress, Rating } from '../../domain/types';
import { applyImplicitCredit } from './credit';
import { loadProgress } from './scarves';
import type { ServiceDeps } from './types';

/** Reviews on the seeded ladder stay choice-based until the item has proved itself twice. */
const CHOICE_UNTIL_STEP = 2;

const ownedBy = (scarfId: string | undefined) => (p: Progress) => scarfId === undefined || p.ownerScarfId === scarfId;

export interface ReweavePlan {
  /** Items due now that get a single question, most overdue first. */
  due: ItemId[];
  /** Tangled items, which need the full ladder instead (see `startTangles`). */
  tangled: ItemId[];
}

/** What is waiting to be reweaved, for one scarf or all. */
export async function planReweave(deps: ServiceDeps, scarfId?: string): Promise<ReweavePlan> {
  const now = deps.clock.now();
  const rows = [...(await loadProgress(deps)).values()].filter(ownedBy(scarfId));
  const byDue = (a: Progress, b: Progress) => (a.fsrs?.due ?? 0) - (b.fsrs?.due ?? 0);
  return {
    due: rows.filter((p) => !p.tangled && isDue(p, now)).sort(byDue).map((p) => p.itemId),
    tangled: rows.filter((p) => p.tangled).sort(byDue).map((p) => p.itemId),
  };
}

/** Moth holes in a scarf right now, capped so damage stays modest. */
export async function scarfMoths(deps: ServiceDeps, scarfId: string): Promise<MothResult> {
  const scarf = await getScarf(scarfId, deps.db);
  if (!scarf) return { holes: [], extraMoths: 0 };
  const now = deps.clock.now();
  const candidates: MothCandidate[] = [...(await loadProgress(deps)).values()]
    .filter((p) => p.ownerScarfId === scarfId && p.fsrs !== null && p.wovenAt !== null)
    .map((p) => ({
      itemId: p.itemId,
      // fsrs is non-null: filtered above.
      due: p.fsrs!.due,
      lastIntervalMs: p.fsrs!.due - p.fsrs!.lastReview,
    }));
  return mothHoles(candidates, now, { totalItems: scarf.wovenOrder.length });
}

/**
 * The single question for a due item. Words and forms are recognised at first,
 * sentences are blanked; once an item has passed two reviews it is typed.
 */
export async function buildReviewExercise(deps: ServiceDeps, itemId: ItemId): Promise<Exercise> {
  const item = deps.items.get(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  const progress = await loadProgress(deps);
  const step = progress.get(itemId)?.seededStep ?? 0;
  const known = [...progress.values()].filter((p) => p.wovenAt !== null).flatMap((p) => deps.items.get(p.itemId) ?? []);

  if (step < CHOICE_UNTIL_STEP) {
    if (item.kind === 'sentence') {
      const ex = buildCloze(item, known, deps.rng);
      if (ex && ex.options.length >= 2) return ex;
    } else {
      const ex = buildRecognise(item, known, deps.rng);
      if (ex.options.length >= 2) return ex;
    }
  }
  return buildProduce(item);
}

export interface RateOutcome {
  progress: Progress;
  /** True when this miss tangled the item. */
  tangled: boolean;
  credited: ImplicitCredit[];
}

/** Records a reweave answer with its rating (Again for a miss). A correct sentence also credits its words. */
export async function rateReview(deps: ServiceDeps, itemId: ItemId, rating: Rating, exercise: Exercise): Promise<RateOutcome> {
  const now = deps.clock.now();
  const before = await getProgress(itemId, deps.db);
  if (!before) throw new Error(`No progress for ${itemId}`);
  const after = review(before, rating, now);
  await putProgress(after, deps.db);
  await appendReview({ itemId, at: now, exercise: exercise.type, rating, implicit: false, weight: 1 }, deps.db);

  const item = deps.items.get(itemId);
  const credited =
    rating !== 'again' && item?.kind === 'sentence'
      ? await applyImplicitCredit(deps, item, exercise, await loadProgress(deps))
      : [];
  return { progress: after, tangled: after.tangled && !before.tangled, credited };
}
