import { appendReview, getProgress, getScarf, listReviews, putProgress } from '../../db/repo';
import { bundleReviews, carrierFor, readyForTyped } from '../../domain/context';
import type { ImplicitCredit } from '../../domain/credit';
import { buildCloze, buildProduce, type Exercise } from '../../domain/exercises';
import { mothHoles, type MothCandidate, type MothResult } from '../../domain/moths';
import { isDue, review } from '../../domain/scheduler';
import type { ItemId, Progress, Rating, Sentence } from '../../domain/types';
import { applyImplicitCredit } from './credit';
import { loadProgress } from './scarves';
import type { ServiceDeps } from './types';

const ownedBy = (scarfId: string | undefined) => (p: Progress) => scarfId === undefined || p.ownerScarfId === scarfId;

export interface ReweavePlan {
  /** Questions to ask, most overdue first. A word proven in a sentence is asked through that sentence. */
  due: ItemId[];
  /** For each question, every item rated by the answer (a sentence covers several words at once). */
  covers: Record<ItemId, ItemId[]>;
  /** Tangled items, which need the full ladder instead (see `startTangles`). */
  tangled: ItemId[];
}

const sentencesOf = (deps: ServiceDeps): Sentence[] => [...deps.items.values()].filter((i): i is Sentence => i.kind === 'sentence');

/** What is waiting to be reweaved, for one scarf or all. */
export async function planReweave(deps: ServiceDeps, scarfId?: string): Promise<ReweavePlan> {
  const now = deps.clock.now();
  const progress = await loadProgress(deps);
  const rows = [...progress.values()].filter(ownedBy(scarfId));
  const byDue = (a: Progress, b: Progress) => (a.fsrs?.due ?? 0) - (b.fsrs?.due ?? 0);
  const due = rows.filter((p) => !p.tangled && isDue(p, now)).sort(byDue).map((p) => p.itemId);
  const units = bundleReviews({
    due,
    items: deps.items,
    progress,
    scope: new Set(rows.map((p) => p.itemId)),
    typedReady: readyForTyped(await listReviews(undefined, deps.db)),
    now,
  });
  return {
    due: units.map((u) => u.itemId),
    covers: Object.fromEntries(units.map((u) => [u.itemId, u.covers])),
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
 * The question for a due item, which only ever gets harder. A sentence is typed
 * whole. A word that has met a sentence is blanked in it until it passes, then
 * asked inside a typed sentence (see `planReweave`). A word that never has is
 * typed, since learning already took it past recognising.
 */
export async function buildReviewExercise(deps: ServiceDeps, itemId: ItemId): Promise<Exercise> {
  const item = deps.items.get(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  if (item.kind === 'sentence') return buildProduce(item);

  const progress = await loadProgress(deps);
  const carrier = carrierFor(itemId, sentencesOf(deps), progress);
  if (!carrier) return buildProduce(item);
  if (readyForTyped(await listReviews(itemId, deps.db)).has(itemId)) return buildProduce(carrier);

  const known = [...progress.values()].filter((p) => p.wovenAt !== null).flatMap((p) => deps.items.get(p.itemId) ?? []);
  const ex = buildCloze(carrier, known, deps.rng, itemId);
  return ex && ex.options.length >= 2 ? ex : buildProduce(carrier);
}

export interface RateOutcome {
  progress: Progress;
  /** True when this miss tangled the item. */
  tangled: boolean;
  credited: ImplicitCredit[];
}

/**
 * Records a reweave answer with its rating (Again for a miss). `covers` lists every
 * item the answer rates; a typed sentence rates all its due words together so their
 * schedules line up. A correct sentence also credits any of its other words.
 */
export async function rateReview(
  deps: ServiceDeps,
  itemId: ItemId,
  rating: Rating,
  exercise: Exercise,
  covers: readonly ItemId[] = [itemId],
): Promise<RateOutcome> {
  const now = deps.clock.now();
  const rated = new Set(covers);
  let first: Progress | null = null;
  let tangled = false;
  for (const id of rated) {
    const before = await getProgress(id, deps.db);
    if (!before) throw new Error(`No progress for ${id}`);
    const after = review(before, rating, now);
    await putProgress(after, deps.db);
    await appendReview({ itemId: id, at: now, exercise: exercise.type, rating, implicit: false, weight: 1 }, deps.db);
    tangled ||= after.tangled && !before.tangled;
    if (id === itemId || first === null) first = after;
  }

  const sentence = deps.items.get(exercise.itemId);
  const others = new Map([...(await loadProgress(deps))].filter(([id]) => !rated.has(id)));
  const credited =
    rating !== 'again' && sentence?.kind === 'sentence' ? await applyImplicitCredit(deps, sentence, exercise, others) : [];
  // `first` is set: `covers` always holds at least one id.
  return { progress: first!, tangled, credited };
}
