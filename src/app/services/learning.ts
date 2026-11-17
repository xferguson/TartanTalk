import { appendReview, getProgress, getScarf, putProgress, putScarf } from '../../db/repo';
import type { ImplicitCredit } from '../../domain/credit';
import { buildCloze, buildProduce, buildRecognise, type Exercise } from '../../domain/exercises';
import { markLearned, newProgress } from '../../domain/scheduler';
import {
  answerCard,
  DEFAULT_BATCH_SIZE,
  LADDER,
  nextCard,
  orderCards,
  planWordBatch,
  selectSentences,
  startBatch,
  type Card,
  type NextCard,
  type Session,
} from '../../domain/session';
import { candidateItems, isLearned, isUnlocked } from '../../domain/unlock';
import type { ItemId, LearnableItem, Progress, Scarf, Sentence } from '../../domain/types';
import { applyImplicitCredit } from './credit';
import { ellsForItem } from './length';
import { loadProgress } from './scarves';
import type { ServiceDeps } from './types';

/** A learning run on the loom: new words for a scarf, or a basket of tangles being relearned. */
export interface LoomSession {
  mode: 'learn' | 'tangles';
  /** The scarf being woven. Null for tangles from several scarves; each item then returns to its owner. */
  scarfId: string | null;
  session: Session;
  /** Words chosen at the start; when all are woven their sentences are queued. */
  batchWords: ItemId[];
  sentencesQueued: boolean;
  /** Items woven during this run, in order. */
  woven: ItemId[];
}

const learnedIds = (progress: ReadonlyMap<ItemId, Progress>): Set<ItemId> =>
  new Set([...progress.values()].filter(isLearned).map((p) => p.itemId));

const isSentence = (item: LearnableItem | undefined): item is Sentence => item?.kind === 'sentence';

function candidatesFor(deps: ServiceDeps, scarf: Scarf, progress: ReadonlyMap<ItemId, Progress>): LearnableItem[] {
  return candidateItems([...deps.items.values()], scarf.tagFilter, progress);
}

/**
 * Chooses the next batch of new words for a scarf. Sentences already unlocked
 * but held back earlier come with it, tied to the most recently woven words.
 */
export async function startLearning(deps: ServiceDeps, scarfId: string, previous?: LoomSession): Promise<LoomSession | null> {
  const scarf = await getScarf(scarfId, deps.db);
  if (!scarf) return null;
  const progress = await loadProgress(deps);
  const learned = learnedIds(progress);
  // Carrying on from a resting session: its missed items come back after their wait, so offer other words meanwhile.
  const resting = new Set(previous?.session.waiting.flatMap((w) => w.card.focal) ?? []);
  const candidates = candidatesFor(deps, scarf, progress).filter((c) => !resting.has(c.id));

  const batchWords = planWordBatch({ candidates, learned });
  const recent = scarf.wovenOrder.filter((id) => deps.items.get(id)?.kind !== 'sentence').slice(-DEFAULT_BATCH_SIZE);
  const backlog = selectSentences({
    sentences: candidates.filter(isSentence),
    learned,
    newWords: recent,
  }).now;

  return {
    mode: 'learn',
    scarfId,
    session: startBatch({
      words: batchWords,
      sentences: backlog,
      batch: previous ? previous.session.batch + 1 : 1,
      previous: previous?.session,
    }),
    batchWords,
    sentencesQueued: false,
    woven: [],
  };
}

/** Relearns tangled items as if new, with the full ladder. Pass a scarf to limit it to that scarf's tangles. */
export async function startTangles(deps: ServiceDeps, scarfId?: string): Promise<LoomSession> {
  const progress = await loadProgress(deps);
  const tangled = [...progress.values()].filter((p) => p.tangled && (scarfId === undefined || p.ownerScarfId === scarfId));
  const items = tangled.flatMap((p) => deps.items.get(p.itemId) ?? []);
  const words = items.filter((i) => i.kind !== 'sentence').map((i) => i.id);
  return {
    mode: 'tangles',
    scarfId: scarfId ?? null,
    session: startBatch({ words, sentences: items.filter(isSentence), batch: 1 }),
    batchWords: words,
    sentencesQueued: true, // tangles never unlock new sentences
    woven: [],
  };
}

export const upNext = (loom: LoomSession, now: number): NextCard => nextCard(loom.session, now);

/**
 * Builds the exercise a card calls for. The ladder is recognise, cloze, then
 * type. A word has no sentence to blank, so its middle rung is typing too, and a
 * choice with nothing to choose between also becomes typing.
 */
export async function buildExercise(deps: ServiceDeps, card: Card, extraKnown: readonly ItemId[] = []): Promise<Exercise> {
  const item = deps.items.get(card.itemId);
  if (!item) throw new Error(`Unknown item ${card.itemId}`);
  const progress = await loadProgress(deps);
  const knownIds = new Set([...learnedIds(progress), ...extraKnown, ...card.focal]);
  const known = [...knownIds].flatMap((id) => deps.items.get(id) ?? []);

  if (card.exercise === 'recognise') {
    const ex = buildRecognise(item, known, deps.rng);
    if (ex.options.length >= 2) return ex;
  }
  if (card.exercise === 'cloze' && isSentence(item)) {
    const ex = buildCloze(item, known, deps.rng);
    if (ex && ex.options.length >= 2) return ex;
  }
  return buildProduce(item);
}

export interface AnswerOutcome {
  loom: LoomSession;
  /** Set when the answer finished the ladder for an item. */
  learned: ItemId | null;
  /** Ells that item added to the scarf. */
  ells: number;
  /** Words that earned partial credit from a sentence answer. */
  credited: ImplicitCredit[];
}

/**
 * Applies an answer during learning: moves the card on the ladder, saves progress,
 * weaves the item into the scarf that introduced it once learned, and queues the
 * batch's sentences when its last word is woven.
 */
export async function answerLearning(
  deps: ServiceDeps,
  loom: LoomSession,
  card: Card,
  exercise: Exercise,
  correct: boolean,
): Promise<AnswerOutcome> {
  const now = deps.clock.now();
  const result = answerCard(loom.session, card, correct, now);
  let session = result.session;

  const existing = (await getProgress(card.itemId, deps.db)) ?? newProgress(card.itemId);
  const rung = Math.min(LADDER.indexOf(card.exercise) + (correct ? 1 : 0), LADDER.length - 1);
  let row: Progress = {
    ...existing,
    phase: 'learning',
    correctInSession: session.correct[card.itemId] ?? 0,
    ladderStep: rung,
  };

  let ells = 0;
  const woven = [...loom.woven];
  if (result.learned) {
    const scarfId = loom.scarfId ?? existing.ownerScarfId;
    if (scarfId === null) throw new Error(`No scarf to weave ${card.itemId} into`);
    row = markLearned(row, now, scarfId);
    const scarf = await getScarf(row.ownerScarfId ?? scarfId, deps.db);
    if (scarf && !scarf.wovenOrder.includes(card.itemId)) {
      await putScarf({ ...scarf, wovenOrder: [...scarf.wovenOrder, card.itemId] }, deps.db);
      ells = ellsForItem(deps.items.get(card.itemId));
    }
    woven.push(card.itemId);
  }
  await putProgress(row, deps.db);
  await appendReview(
    { itemId: card.itemId, at: now, exercise: exercise.type, rating: correct ? 'good' : 'again', implicit: false, weight: 1 },
    deps.db,
  );

  let credited: ImplicitCredit[] = [];
  const item = deps.items.get(card.itemId);
  if (correct && isSentence(item)) credited = await applyImplicitCredit(deps, item, exercise, await loadProgress(deps));

  let sentencesQueued = loom.sentencesQueued;
  if (result.learned && !sentencesQueued && loom.mode === 'learn' && loom.scarfId !== null) {
    const progress = await loadProgress(deps);
    if (loom.batchWords.every((id) => isLearned(progress.get(id)))) {
      sentencesQueued = true;
      session = await queueSentences(deps, loom, session, progress);
    }
  }

  return { loom: { ...loom, session, sentencesQueued, woven }, learned: result.learned, ells, credited };
}

/** Adds the sentences the batch's words have just unlocked, at most two per new word. */
async function queueSentences(
  deps: ServiceDeps,
  loom: LoomSession,
  session: Session,
  progress: ReadonlyMap<ItemId, Progress>,
): Promise<Session> {
  const scarf = loom.scarfId ? await getScarf(loom.scarfId, deps.db) : undefined;
  if (!scarf) return session;
  const learned = learnedIds(progress);
  const sentences = candidatesFor(deps, scarf, progress).filter(isSentence).filter((s) => isUnlocked(s, learned));
  const { now: chosen } = selectSentences({ sentences, learned, newWords: loom.batchWords });
  const queued = new Set(session.queue.map((c) => c.itemId));
  const fresh = startBatch({ words: [], sentences: chosen.filter((s) => !queued.has(s.id)), batch: session.batch + 1 });
  return { ...session, batch: fresh.batch, queue: orderCards([...session.queue, ...fresh.queue]) };
}
