import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { startScarf } from '../../../src/app/services';
import { createSessionStore } from '../../../src/app/store/sessionStore';
import { getProgress, getScarf } from '../../../src/db/repo';
import type { Exercise } from '../../../src/domain/exercises';
import { DAY, harness, passIntros, SCARF_TAGS, type Harness } from './helpers';

let h: Harness;
afterEach(async () => {
  await h?.database.delete();
});

const answerOf = (ex: Exercise) => (ex.type === 'produce' ? ex.answer : (ex.options.find((o) => o.correct)?.text ?? ''));

describe('session store', () => {
  it('runs a scarf session through to done, showing each weaving', async () => {
    h = harness();
    const store = createSessionStore(() => h.deps);
    const scarf = await startScarf(h.deps, { name: 'S', tagFilter: SCARF_TAGS, tartanId: 't' });
    await store.getState().startLearning(scarf.id);

    let weavings = 0;
    for (let guard = 0; guard < 200 && !store.getState().done; guard++) {
      await passIntros(store);
      if (store.getState().done) break;
      const { exercise } = store.getState();
      expect(exercise).not.toBeNull();
      await store.getState().submit(answerOf(exercise!));
      if (store.getState().weaving) weavings++;
      await store.getState().next();
    }
    expect(store.getState().done).toBe(true);
    expect(weavings).toBe((await getScarf(scarf.id, h.database))!.wovenOrder.length);
    expect(weavings).toBeGreaterThan(4);
  });

  it('shows a wrong answer and ignores a second submit while feedback is showing', async () => {
    h = harness();
    const store = createSessionStore(() => h.deps);
    const scarf = await startScarf(h.deps, { name: 'S', tagFilter: ['topic:love'], tartanId: 't' });
    await store.getState().startLearning(scarf.id);
    await passIntros(store);
    await store.getState().submit('definitely wrong');
    expect(store.getState().feedback?.check.correct).toBe(false);
    await store.getState().submit(answerOf(store.getState().exercise!));
    expect(store.getState().feedback?.check.correct).toBe(false);
  });

  it('reweaves after time travel, holding a correct answer for its rating', async () => {
    h = harness();
    const store = createSessionStore(() => h.deps);
    const scarf = await startScarf(h.deps, { name: 'S', tagFilter: SCARF_TAGS, tartanId: 't' });
    await store.getState().startLearning(scarf.id);
    while (!store.getState().done) {
      await passIntros(store);
      if (store.getState().done) break;
      await store.getState().submit(answerOf(store.getState().exercise!));
      await store.getState().next();
    }

    await store.getState().startReweave(scarf.id);
    expect(store.getState().done).toBe(true); // nothing due yet

    h.clock.advance(2 * DAY);
    await store.getState().startReweave(scarf.id);
    const n = store.getState().queue.length;
    expect(n).toBeGreaterThan(0);

    await store.getState().submit(answerOf(store.getState().exercise!));
    expect(store.getState().feedback).toMatchObject({ awaitingRating: true, suggestedRating: 'good' });
    expect(store.getState().queue).toHaveLength(n); // not removed until rated
    await store.getState().rate('easy');
    // Rating moves straight on: no separate Next step.
    expect(store.getState().queue).toHaveLength(n - 1);
    expect(store.getState().feedback).toBeNull();
  });

  it('saves a reweave miss straight away as Again', async () => {
    h = harness();
    const store = createSessionStore(() => h.deps);
    const scarf = await startScarf(h.deps, { name: 'S', tagFilter: ['topic:love'], tartanId: 't' });
    await store.getState().startLearning(scarf.id);
    while (!store.getState().done) {
      await passIntros(store);
      if (store.getState().done) break;
      await store.getState().submit(answerOf(store.getState().exercise!));
      await store.getState().next();
    }
    h.clock.advance(2 * DAY);
    await store.getState().startReweave(scarf.id);
    await store.getState().submit('definitely wrong');
    expect(store.getState().feedback).toMatchObject({ suggestedRating: 'again', awaitingRating: false });
  });

  /** Learns the whole scarf, then travels two days on so everything is due. */
  async function dueScarf() {
    h = harness();
    const store = createSessionStore(() => h.deps);
    const scarf = await startScarf(h.deps, { name: 'S', tagFilter: SCARF_TAGS, tartanId: 't' });
    await store.getState().startLearning(scarf.id);
    while (!store.getState().done) {
      await passIntros(store);
      if (store.getState().done) break;
      await store.getState().submit(answerOf(store.getState().exercise!));
      await store.getState().next();
    }
    h.clock.advance(2 * DAY);
    await store.getState().startReweave(scarf.id);
    return { store, scarf };
  }

  it('asks a missed thread again at the very end, after the others', async () => {
    const { store } = await dueScarf();
    const [first, ...others] = store.getState().queue;
    await store.getState().submit('definitely wrong');
    expect(store.getState().queue).toEqual([...others, first]);
    // The miss is saved at once and the thread stays due, so its hole stays if the learner leaves.
    const saved = (await getProgress(first, h.database))!;
    expect(saved.fsrs!.due).toBeLessThanOrEqual(h.clock.now());
    expect(saved.consecutiveMisses).toBe(1);
  });

  it('mends a missed thread on the second try, on a short interval', async () => {
    const { store } = await dueScarf();
    const first = store.getState().queue[0];
    await store.getState().submit('definitely wrong');
    while (store.getState().queue[0] !== first) {
      await store.getState().next();
      await store.getState().submit(answerOf(store.getState().exercise!));
      await store.getState().rate('good');
    }
    await store.getState().next();
    expect(store.getState().itemId).toBe(first);
    await store.getState().submit(answerOf(store.getState().exercise!));
    await store.getState().rate('good');
    const mended = (await getProgress(first, h.database))!;
    expect(mended.tangled).toBe(false);
    expect(mended.consecutiveMisses).toBe(0);
    expect(mended.fsrs!.due - h.clock.now()).toBe(DAY); // back on the first rung, not the 4-day one
    expect(store.getState().queue).toHaveLength(0);
  });

  it('tangles a thread missed twice in a session, without a third try', async () => {
    const { store } = await dueScarf();
    const first = store.getState().queue[0];
    await store.getState().submit('definitely wrong');
    while (store.getState().queue[0] !== first) {
      await store.getState().next();
      await store.getState().submit(answerOf(store.getState().exercise!));
      await store.getState().rate('good');
    }
    await store.getState().next();
    await store.getState().submit('wrong again');
    expect((await getProgress(first, h.database))!.tangled).toBe(true);
    expect(store.getState().queue).toHaveLength(0);
    expect(store.getState().tangledLeft).toBe(1);
  });

  it('lets the learner say they already knew a sentence after its first correct answer', async () => {
    h = harness();
    const store = createSessionStore(() => h.deps);
    const scarf = await startScarf(h.deps, { name: 'S', tagFilter: SCARF_TAGS, tartanId: 't' });
    await store.getState().startLearning(scarf.id);
    while (store.getState().card?.exercise === 'introduce') await store.getState().introduce('known');

    const sentence = store.getState().itemId!;
    expect(sentence.startsWith('sent:')).toBe(true);
    expect(store.getState().canClaimKnown).toBe(false);
    await store.getState().submit(answerOf(store.getState().exercise!));
    expect(store.getState().canClaimKnown).toBe(true);

    const answered = store.getState().answered;
    await store.getState().claimKnown();
    expect(store.getState().answered).toBe(answered + 1);
    expect(store.getState().itemId).not.toBe(sentence);
    expect(store.getState().canClaimKnown).toBe(false);
    expect(store.getState().loom!.session.queue.some((c) => c.itemId === sentence)).toBe(false);
    expect(await getProgress(sentence, h.database)).toMatchObject({ fsrs: null, phase: 'review' });
  });
});
