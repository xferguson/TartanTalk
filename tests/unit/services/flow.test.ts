import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import {
  answerLearning,
  buildExercise,
  buildReviewExercise,
  claimKnown,
  planReweave,
  rateReview,
  respondToIntroduction,
  scarfLengthElls,
  scarfMoths,
  startLearning,
  startScarf,
  startTangles,
  upNext,
  type LoomSession,
  type ServiceDeps,
} from '../../../src/app/services';
import { getProgress, getScarf, listReviews } from '../../../src/db/repo';
import type { Card } from '../../../src/domain/session';
import { isLearned } from '../../../src/domain/unlock';
import { DAY, harness, learningPastIntros, SCARF_TAGS, type Harness } from './helpers';

let h: Harness;
const setup = () => (h = harness());
afterEach(async () => {
  await h?.database.delete();
});

async function newScarf(deps: ServiceDeps) {
  return startScarf(deps, { name: 'Love and languages', tagFilter: SCARF_TAGS, tartanId: 'ferguson-old' });
}

/** Answers cards correctly until the session is done, waiting out nothing (no misses). */
async function weaveEverything(deps: ServiceDeps, loom: LoomSession): Promise<LoomSession> {
  let current = loom;
  for (let guard = 0; guard < 200; guard++) {
    const up = upNext(current, deps.clock.now());
    if (up.type !== 'card') return current;
    if (up.card.exercise === 'introduce') {
      current = (await respondToIntroduction(deps, current, up.card, 'got-it')).loom;
      continue;
    }
    const ex = await buildExercise(deps, up.card, current);
    current = (await answerLearning(deps, current, up.card, ex, true)).loom;
  }
  throw new Error('session did not finish');
}

describe('starting a scarf', () => {
  it('saves an empty scarf stamped with the clock', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    expect(await getScarf(scarf.id, h.database)).toMatchObject({ name: 'Love and languages', wovenOrder: [], createdAt: h.clock.now(), pausedAt: null });
  });

  it('falls back to a name when none is given', async () => {
    setup();
    expect((await startScarf(h.deps, { name: '  ', tagFilter: [], tartanId: 't' })).name).toBe('Untitled scarf');
  });
});

describe('learning', () => {
  it('offers different words while a missed item is resting', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const first = (await learningPastIntros(h.deps, scarf.id))!;
    const card = first.session.queue[0];
    const ex = await buildExercise(h.deps, card, first);
    const missed = await answerLearning(h.deps, first, card, ex, false);

    const more = (await startLearning(h.deps, scarf.id, missed.loom))!;
    expect(more.batchWords.length).toBeGreaterThan(0);
    expect(more.batchWords).not.toContain(card.itemId);
    expect(more.session.waiting.map((w) => w.card.itemId)).toContain(card.itemId);
    expect(more.session.batch).toBe(first.session.batch + 1);
  });

  it('weaves a word after two correct answers, once, into its scarf', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = (await learningPastIntros(h.deps, scarf.id))!;
    const first = loom.session.queue[0];
    const id = first.itemId;

    const ex1 = await buildExercise(h.deps, first, loom);
    let out = await answerLearning(h.deps, loom, first, ex1, true);
    expect(out.learned).toBeNull();
    expect((await getProgress(id, h.database))?.phase).toBe('learning');

    const second = out.loom.session.queue.find((c) => c.itemId === id)!;
    const ex2 = await buildExercise(h.deps, second, out.loom);
    out = await answerLearning(h.deps, out.loom, second, ex2, true);

    expect(out.learned).toBe(id);
    expect(out.ells).toBeGreaterThan(0);
    const row = await getProgress(id, h.database);
    expect(row).toMatchObject({ phase: 'review', ownerScarfId: scarf.id, wovenAt: h.clock.now() });
    expect(row?.fsrs?.due).toBe(h.clock.now() + DAY);
    expect((await getScarf(scarf.id, h.database))?.wovenOrder).toEqual([id]);
    expect((await listReviews(id, h.database)).map((r) => r.rating)).toEqual(['good', 'good']);
  });

  it('holds a missed card for ten minutes', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = (await learningPastIntros(h.deps, scarf.id))!;
    const card = loom.session.queue[0];
    const ex = await buildExercise(h.deps, card, loom);
    const out = await answerLearning(h.deps, loom, card, ex, false);
    expect(out.learned).toBeNull();
    expect(out.loom.session.waiting.map((w) => w.card.itemId)).toContain(card.itemId);
    expect((await listReviews(card.itemId, h.database))[0].rating).toBe('again');
  });

  it('queues the unlocked sentences once the whole batch is woven', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = (await learningPastIntros(h.deps, scarf.id))!;
    expect(loom.session.queue.every((c) => !c.itemId.startsWith('sent:'))).toBe(true);

    const done = await weaveEverything(h.deps, loom);
    const saved = (await getScarf(scarf.id, h.database))!;
    const woven = saved.wovenOrder;
    expect(woven.filter((id) => id.startsWith('sent:')).length).toBeGreaterThan(0);
    expect(done.sentencesQueued).toBe(true);
    // Words come before the sentences they unlocked.
    expect(woven.indexOf(loom.batchWords[0])).toBeLessThan(woven.findIndex((id) => id.startsWith('sent:')));
    expect(scarfLengthElls(woven, h.deps.items)).toBeGreaterThan(0.1);
  });

  it('gives partial credit to the words of a typed sentence', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    await weaveEverything(h.deps, (await learningPastIntros(h.deps, scarf.id))!);
    const log = await listReviews(undefined, h.database);
    // Sentence answers on the cloze and typed rungs credit their words implicitly.
    expect(log.some((r) => r.implicit && r.weight > 0)).toBe(true);
  });
});

describe('reweaving', () => {
  async function wovenScarf() {
    const scarf = await newScarf(h.deps);
    await weaveEverything(h.deps, (await learningPastIntros(h.deps, scarf.id))!);
    return scarf;
  }

  it('has nothing due straight after weaving, then holes appear once time passes', async () => {
    setup();
    const scarf = await wovenScarf();
    expect((await planReweave(h.deps, scarf.id)).due).toEqual([]);
    expect((await scarfMoths(h.deps, scarf.id)).holes).toEqual([]);

    h.clock.advance(2 * DAY);
    const plan = await planReweave(h.deps, scarf.id);
    expect(plan.due.length).toBeGreaterThan(0);
    const moths = await scarfMoths(h.deps, scarf.id);
    expect(moths.holes.length + moths.extraMoths).toBe(plan.due.length);
  });

  it('moves a rated item along the 1, 4, 16 day ladder', async () => {
    setup();
    const scarf = await wovenScarf();
    h.clock.advance(2 * DAY);
    const id = (await planReweave(h.deps, scarf.id)).due[0];
    const ex = await buildReviewExercise(h.deps, id);
    const out = await rateReview(h.deps, id, 'good', ex);
    expect(out.progress.fsrs!.due).toBe(h.clock.now() + 4 * DAY);
    expect((await planReweave(h.deps, scarf.id)).due).not.toContain(id);
  });

  it('tangles an item after two misses and untangles it by relearning', async () => {
    setup();
    const scarf = await wovenScarf();
    h.clock.advance(2 * DAY);
    const id = (await planReweave(h.deps, scarf.id)).due[0];
    const ex = await buildReviewExercise(h.deps, id);
    expect((await rateReview(h.deps, id, 'again', ex)).tangled).toBe(false);
    h.clock.advance(DAY);
    expect((await rateReview(h.deps, id, 'again', ex)).tangled).toBe(true);

    const plan = await planReweave(h.deps, scarf.id);
    expect(plan.tangled).toEqual([id]);
    expect(plan.due).not.toContain(id);

    const woven = (await getScarf(scarf.id, h.database))!.wovenOrder.length;
    await weaveEverything(h.deps, await startTangles(h.deps, scarf.id));
    expect(await getProgress(id, h.database)).toMatchObject({ tangled: false, phase: 'review' });
    expect((await getScarf(scarf.id, h.database))!.wovenOrder).toHaveLength(woven); // woven once, never twice
  });
});

describe('exercises', () => {
  it('asks a new word to be typed on the rung where a sentence would be blanked', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = (await learningPastIntros(h.deps, scarf.id))!;
    const card: Card = { ...loom.session.queue[0], exercise: 'cloze' };
    expect((await buildExercise(h.deps, card, loom)).type).toBe('produce');
  });
});

/** Answers every card correctly until the batch's sentences are queued. */
async function untilSentences(deps: ServiceDeps, loom: LoomSession): Promise<LoomSession> {
  let current = loom;
  for (let guard = 0; guard < 100 && !current.sentencesQueued; guard++) {
    const up = upNext(current, deps.clock.now());
    if (up.type !== 'card') break;
    const ex = await buildExercise(deps, up.card, current);
    current = (await answerLearning(deps, current, up.card, ex, true)).loom;
  }
  return current;
}

/** Says "I already know this" to every word in the first batch. */
async function knowingEveryWord(deps: ServiceDeps, scarfId: string): Promise<LoomSession> {
  let loom = (await startLearning(deps, scarfId))!;
  for (let c = loom.session.queue.find((q) => q.exercise === 'introduce'); c; c = loom.session.queue.find((q) => q.exercise === 'introduce')) {
    loom = (await respondToIntroduction(deps, loom, c, 'known')).loom;
  }
  return loom;
}

const sentenceCard = (loom: LoomSession) => loom.session.queue.find((c) => c.itemId.startsWith('sent:'));

describe('cloze blanks only words in play', () => {
  it('never blanks a word marked known; the sentence is typed whole instead', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = await knowingEveryWord(h.deps, scarf.id);
    const card = sentenceCard(loom);
    expect(card).toBeDefined();
    expect((await buildExercise(h.deps, { ...card!, exercise: 'cloze' }, loom)).type).toBe('produce');
  });

  it('blanks a word woven in this run', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = await untilSentences(h.deps, await learningPastIntros(h.deps, scarf.id));
    const card = sentenceCard(loom);
    expect(card).toBeDefined();
    const ex = await buildExercise(h.deps, { ...card!, exercise: 'cloze' }, loom);
    expect(ex.type).toBe('cloze');
    if (ex.type === 'cloze') expect(loom.woven).toContain(ex.targetId);
  });

  it('in a reweave, types a due sentence whole when none of its words are due', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    await weaveEverything(h.deps, (await learningPastIntros(h.deps, scarf.id))!);
    h.clock.advance(2 * DAY);
    const due = (await planReweave(h.deps, scarf.id)).due;
    const sentence = due.find((id) => id.startsWith('sent:'))!;
    const words = due.filter((id) => !id.startsWith('sent:'));

    const withDueWords = await buildReviewExercise(h.deps, sentence);
    expect(withDueWords.type).toBe('cloze');
    if (withDueWords.type === 'cloze') expect(words).toContain(withDueWords.targetId);

    for (const id of words) await rateReview(h.deps, id, 'good', await buildReviewExercise(h.deps, id));
    expect((await buildReviewExercise(h.deps, sentence)).type).toBe('produce');
  });
});

describe('"I already knew this" for a sentence', () => {
  it('is offered after the first correct answer to a sentence never seen before, and only then', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = await knowingEveryWord(h.deps, scarf.id);
    const card = sentenceCard(loom)!;
    const first = await answerLearning(h.deps, loom, card, await buildExercise(h.deps, card, loom), true);
    expect(first.canClaimKnown).toBe(true);

    const again = first.loom.session.queue.find((c) => c.itemId === card.itemId)!;
    const second = await answerLearning(h.deps, first.loom, again, await buildExercise(h.deps, again, first.loom), true);
    expect(second.canClaimKnown).toBe(false);
  });

  it('is not offered after a miss, or for a word', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const words = await learningPastIntros(h.deps, scarf.id);
    const word = words.session.queue[0];
    expect((await answerLearning(h.deps, words, word, await buildExercise(h.deps, word, words), true)).canClaimKnown).toBe(false);

    setup();
    const scarf2 = await newScarf(h.deps);
    const loom = await knowingEveryWord(h.deps, scarf2.id);
    const card = sentenceCard(loom)!;
    const ex = await buildExercise(h.deps, card, loom);
    const missed = await answerLearning(h.deps, loom, card, ex, false);
    expect(missed.canClaimKnown).toBe(false);
    const back = missed.loom.session.waiting.find((w) => w.card.itemId === card.itemId)!.card;
    const retry = await answerLearning(h.deps, missed.loom, back, await buildExercise(h.deps, back, missed.loom), true);
    expect(retry.canClaimKnown).toBe(false);
  });

  it('counts the sentence as known: learned, never scheduled, not woven, and out of the session', async () => {
    setup();
    const scarf = await newScarf(h.deps);
    const loom = await knowingEveryWord(h.deps, scarf.id);
    const card = sentenceCard(loom)!;
    const first = await answerLearning(h.deps, loom, card, await buildExercise(h.deps, card, loom), true);
    const after = await claimKnown(h.deps, first.loom, card.itemId);

    const row = await getProgress(card.itemId, h.database);
    expect(isLearned(row)).toBe(true);
    expect(row).toMatchObject({ phase: 'review', fsrs: null, ownerScarfId: scarf.id });
    expect((await getScarf(scarf.id, h.database))!.wovenOrder).not.toContain(card.itemId);
    expect(after.session.queue.some((c) => c.itemId === card.itemId)).toBe(false);
    expect(after.session.waiting.some((w) => w.card.itemId === card.itemId)).toBe(false);
  });
});
