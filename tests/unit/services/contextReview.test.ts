import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  answerLearning,
  buildExercise,
  buildReviewExercise,
  planReweave,
  rateReview,
  respondToIntroduction,
  startLearning,
  startScarf,
  upNext,
  type LoomSession,
  type ServiceDeps,
} from '../../../src/app/services';
import { getProgress, listReviews, putProgress } from '../../../src/db/repo';
import { markLearned, newProgress, review } from '../../../src/domain/scheduler';
import { DAY, harness, SCARF_TAGS, T0, type Harness } from './helpers';

let h: Harness;
afterEach(async () => {
  await h?.database.delete();
});

const newScarf = (deps: ServiceDeps) => startScarf(deps, { name: 'Love', tagFilter: SCARF_TAGS, tartanId: 'ferguson-old' });

async function weaveEverything(deps: ServiceDeps, loom: LoomSession): Promise<void> {
  let current = loom;
  for (let guard = 0; guard < 300; guard++) {
    const up = upNext(current, deps.clock.now());
    if (up.type !== 'card') return;
    if (up.card.exercise === 'introduce') {
      current = (await respondToIntroduction(deps, current, up.card, 'got-it')).loom;
      continue;
    }
    const ex = await buildExercise(deps, up.card, current);
    current = (await answerLearning(deps, current, up.card, ex, true)).loom;
  }
}

/** A scarf whose words and sentences are all woven, so reviews can draw on both. */
async function wovenScarf() {
  const scarf = await newScarf(h.deps);
  for (let round = 0; round < 6; round++) {
    const loom = await startLearning(h.deps, scarf.id);
    if (!loom || loom.batchWords.length === 0 && loom.session.queue.length === 0) break;
    await weaveEverything(h.deps, loom);
  }
  return scarf;
}

/** Reviews every due question with Good, as a learner passing a round would. */
async function passRound(scarfId: string): Promise<void> {
  const plan = await planReweave(h.deps, scarfId);
  for (const id of plan.due) await rateReview(h.deps, id, 'good', await buildReviewExercise(h.deps, id), plan.covers[id]);
}

describe('reviewing in context', () => {
  it('starts with a one-word cloze, then climbs to typed sentences covering several words, and stays there', async () => {
    h = harness();
    const scarf = await wovenScarf();
    h.clock.advance(2 * DAY);
    const first = await planReweave(h.deps, scarf.id);
    const wordTypes = await Promise.all(first.due.filter((id) => !id.startsWith('sent:')).map(async (id) => (await buildReviewExercise(h.deps, id)).type));
    expect(wordTypes.length).toBeGreaterThan(0);
    expect(new Set(wordTypes)).toEqual(new Set(['cloze']));
    await passRound(scarf.id);

    h.clock.advance(5 * DAY);
    const second = await planReweave(h.deps, scarf.id);
    expect(second.due.every((id) => id.startsWith('sent:'))).toBe(true);
    expect(Math.max(...second.due.map((id) => second.covers[id].length))).toBeGreaterThan(1);
    expect((await buildReviewExercise(h.deps, second.due[0])).type).toBe('produce');

    // Missing the typed sentence does not send anyone back to the easier format.
    for (const id of second.due) await rateReview(h.deps, id, 'again', await buildReviewExercise(h.deps, id), second.covers[id]);
    h.clock.advance(DAY);
    const third = await planReweave(h.deps, scarf.id);
    expect(third.due.every((id) => id.startsWith('sent:'))).toBe(true);
  });

  it('rates every covered word together, moving them to the same next step', async () => {
    h = harness();
    const scarf = await wovenScarf();
    h.clock.advance(2 * DAY);
    await passRound(scarf.id);
    h.clock.advance(5 * DAY);
    const plan = await planReweave(h.deps, scarf.id);
    const carrier = plan.due.find((id) => plan.covers[id].length > 1)!;
    const covers = plan.covers[carrier];
    await rateReview(h.deps, carrier, 'good', await buildReviewExercise(h.deps, carrier), covers);
    const dues = new Set<number>();
    for (const id of covers) {
      dues.add((await getProgress(id, h.database))!.fsrs!.due);
      expect((await listReviews(id, h.database)).filter((r) => !r.implicit && r.at === h.clock.now())).toHaveLength(1);
    }
    expect(dues.size).toBe(1);
  });

  it('falls back to a one-word cloze on the sentence for a word asked alone', async () => {
    h = harness();
    const scarf = await wovenScarf();
    h.clock.advance(2 * DAY);
    const plan = await planReweave(h.deps, scarf.id);
    const word = plan.due.flatMap((id) => plan.covers[id] ?? []).find((id) => !id.startsWith('sent:'))!;
    const ex = await buildReviewExercise(h.deps, word);
    expect(ex.type).toBe('cloze');
    if (ex.type === 'cloze') expect(ex.targetId).toBe(word);
  });
});

describe('teaching sentences to words that lack them', () => {
  it('puts a sentence first for words reviewed a couple of times with no sentence yet', async () => {
    h = harness();
    const scarf = await newScarf(h.deps);
    for (const id of ['lex:tha', 'lex:gaol', 'form:aig.1sg', 'form:air.2sg']) {
      const woven = markLearned(newProgress(id), T0, scarf.id);
      await putProgress(review(review(woven, 'good', T0 + DAY), 'good', T0 + 5 * DAY), h.database);
    }
    h.clock.advance(30 * DAY);
    const loom = (await startLearning(h.deps, scarf.id))!;
    expect(loom.session.queue[0].itemId).toBe('sent:love-001');
  });
});
