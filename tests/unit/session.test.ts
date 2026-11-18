import { describe, expect, it } from 'vitest';
import {
  LADDER,
  MIN_FOCAL_GAP,
  RELEARN_AFTER_MS,
  answerCard,
  nextCard,
  orderCards,
  planWordBatch,
  selectSentences,
  respondToIntro,
  startBatch,
  LATER_MS,
  type Card,
  type Session,
} from '../../src/domain/session';
import { ALL_ITEMS, SENTENCES, agad, agam, aige, beurla, gaidhlig, gaol, iHaveEnglish, iHaveGaelic, heHasGaelic, iLoveYou, ort, orm, tha, youHaveGaelic, youLoveMe } from './fixtures/slice';

const T0 = Date.UTC(2026, 10, 1, 9);

/** Answers "Got it" on every introduce card, leaving the quiz cards. */
function past(session: Session): Session {
  let s = session;
  for (let c = s.queue.find((q) => q.exercise === 'introduce'); c; c = s.queue.find((q) => q.exercise === 'introduce')) {
    s = respondToIntro(s, c, 'got-it', T0).session;
  }
  return s;
}

describe('planWordBatch', () => {
  it('picks 3-4 words that complete a sentence before falling back to frequency', () => {
    const batch = planWordBatch({ candidates: ALL_ITEMS, learned: new Set(), size: 4 });
    expect(batch).toHaveLength(4);
    // "Tha Gàidhlig agam." needs only 3 words, so it is completed first.
    expect(batch).toEqual(expect.arrayContaining([tha.id, gaidhlig.id, agam.id]));
  });

  it('completes the cheapest sentences given what is already learned', () => {
    const batch = planWordBatch({ candidates: ALL_ITEMS, learned: new Set([tha.id, gaidhlig.id, agam.id]), size: 3 });
    // agad, aige, beurla each complete a sentence on their own.
    expect(batch).toEqual(expect.arrayContaining([agad.id, aige.id, beurla.id]));
  });

  it('never returns sentences or already learned items', () => {
    const batch = planWordBatch({ candidates: ALL_ITEMS, learned: new Set([tha.id]), size: 4 });
    expect(batch).not.toContain(tha.id);
    expect(batch.every((id) => !id.startsWith('sent:'))).toBe(true);
  });
});

describe('planWordBatch: sentences first, without starving vocabulary', () => {
  it('prefers sentences that teach the most target words for the fewest new words', () => {
    // Scarf is about prep:aig. After tha and Gàidhlig, each new form completes a sentence on its own.
    const learned = new Set([tha.id, gaidhlig.id]);
    const batch = planWordBatch({ candidates: ALL_ITEMS, learned, size: 3, tagFilter: ['prep:aig'] });
    expect(batch).toEqual(expect.arrayContaining([agam.id, agad.id, aige.id]));
  });

  it('does not repeat a target form just to reuse a supporting noun', () => {
    // agam is learned, so Beurla+agam (gain 0.25) loses to a fresh form (gain 1).
    const learned = new Set([tha.id, gaidhlig.id, agam.id]);
    const batch = planWordBatch({ candidates: ALL_ITEMS, learned, size: 2, tagFilter: ['prep:aig'] });
    expect(batch).toEqual(expect.arrayContaining([agad.id, aige.id]));
  });

  it('moves toward a sentence that is too big for one batch instead of ignoring sentences', () => {
    // sent:love-001 needs tha, gaol, agam, ort (4) but the batch holds 2: take its words, target forms first.
    const batch = planWordBatch({ candidates: [tha, gaol, agam, ort, iLoveYou], learned: new Set(), size: 2, tagFilter: ['prep:aig', 'prep:air'] });
    expect(batch).toEqual(expect.arrayContaining([agam.id, ort.id]));
  });

  it('skips words snoozed with Later until 24 hours have passed', () => {
    const snoozed = new Map([[agam.id, T0 + LATER_MS]]);
    const during = planWordBatch({ candidates: ALL_ITEMS, learned: new Set([tha.id, gaidhlig.id]), size: 4, snoozed, now: T0 });
    expect(during).not.toContain(agam.id);
    const after = planWordBatch({ candidates: ALL_ITEMS, learned: new Set([tha.id, gaidhlig.id]), size: 4, snoozed, now: T0 + LATER_MS });
    expect(after).toContain(agam.id);
  });
});

describe('introducing a new word', () => {
  it('shows each new word as an introduce card, with no quiz first', () => {
    const session = startBatch({ words: [gaol.id, tha.id], batch: 1 });
    expect(session.queue.every((c) => c.exercise === 'introduce')).toBe(true);
  });

  it('"Got it" tests the same word straight away with recognition', () => {
    let session = startBatch({ words: [gaol.id, tha.id], batch: 1 });
    const intro = (nextCard(session, T0) as { card: Card }).card;
    const r = respondToIntro(session, intro, 'got-it', T0);
    session = r.session;
    expect(r).toMatchObject({ known: null, snoozedUntil: null });
    expect(nextCard(session, T0)).toMatchObject({ type: 'card', card: { itemId: intro.itemId, exercise: 'recognise' } });
  });

  it('"Later" drops the word for 24 hours and never quizzes it', () => {
    const session = startBatch({ words: [gaol.id, tha.id], batch: 1 });
    const intro = session.queue[0];
    const r = respondToIntro(session, intro, 'later', T0);
    expect(r.snoozedUntil).toBe(T0 + LATER_MS);
    expect(r.session.queue.some((c) => c.itemId === intro.itemId)).toBe(false);
    expect(r.learned).toBeNull();
  });

  it('"I already know this" marks it known, with no quiz and nothing to weave', () => {
    const session = startBatch({ words: [gaol.id, tha.id], batch: 1 });
    const intro = session.queue[0];
    const r = respondToIntro(session, intro, 'known', T0);
    expect(r.known).toBe(intro.itemId);
    expect(r.learned).toBeNull();
    expect(r.session.queue.some((c) => c.itemId === intro.itemId)).toBe(false);
  });

  it('refuses to score an introduce card as an answer', () => {
    const session = startBatch({ words: [gaol.id], batch: 1 });
    expect(() => answerCard(session, session.queue[0], true, T0)).toThrow();
  });
});

describe('selectSentences', () => {
  it('offers at most two sentences per new word and holds the rest back', () => {
    const learned = new Set([tha.id, gaidhlig.id, beurla.id, agam.id, agad.id, aige.id]);
    const { now, deferred } = selectSentences({ sentences: SENTENCES, learned, newWords: [agam.id, agad.id, aige.id, beurla.id, gaidhlig.id], perWord: 2 });
    const counts = new Map<string, number>();
    for (const s of now) for (const t of s.tokens) if (t.itemId) counts.set(t.itemId, (counts.get(t.itemId) ?? 0) + 1);
    expect(counts.get(gaidhlig.id)).toBeLessThanOrEqual(2);
    expect(now.length + deferred.length).toBe(4); // the 4 unlocked language sentences
    expect(deferred.length).toBeGreaterThan(0);
  });

  it('prefers sentences that vary the partner words', () => {
    const learned = new Set([tha.id, gaidhlig.id, beurla.id, agam.id, agad.id]);
    const { now } = selectSentences({ sentences: [iHaveGaelic, youHaveGaelic, iHaveEnglish], learned, newWords: [agam.id], perWord: 2 });
    expect(now.map((s) => s.id)).toEqual([iHaveGaelic.id, iHaveEnglish.id]);
  });

  it('only offers unlocked sentences', () => {
    const { now, deferred } = selectSentences({ sentences: SENTENCES, learned: new Set([tha.id, gaol.id, agam.id]), newWords: [agam.id], perWord: 2 });
    expect([...now, ...deferred].some((s) => s.id === iLoveYou.id)).toBe(false);
  });
});

describe('orderCards', () => {
  const card = (itemId: string, focal: string[], pattern?: string): Card => ({ itemId, exercise: 'recognise', focal, pattern, batch: 1 });

  it('keeps cards sharing a focal word at least the minimum gap apart when possible', () => {
    const cards = [card('a1', ['a']), card('a2', ['a']), card('b', ['b']), card('c', ['c']), card('d', ['d']), card('e', ['e'])];
    const ordered = orderCards(cards).map((c) => c.itemId);
    expect(Math.abs(ordered.indexOf('a2') - ordered.indexOf('a1'))).toBeGreaterThanOrEqual(MIN_FOCAL_GAP);
  });

  it('avoids two sentences with the same pattern back to back when there is an alternative', () => {
    const cards = [card('s1', ['x'], 'p1'), card('s2', ['y'], 'p1'), card('s3', ['z'], 'p2')];
    const ordered = orderCards(cards);
    for (let i = 1; i < ordered.length; i++) {
      if (ordered[i].pattern && ordered[i].pattern === ordered[i - 1].pattern) {
        throw new Error('same pattern back to back');
      }
    }
  });

  it('still returns every card when spacing is impossible', () => {
    const cards = [card('a1', ['a']), card('a2', ['a'])];
    expect(orderCards(cards)).toHaveLength(2);
  });
});

describe('learning ladder within a session', () => {
  it('climbs recognise, cloze, produce and reports learned after two correct answers', () => {
    expect(LADDER).toEqual(['recognise', 'cloze', 'produce']);
    let session = past(startBatch({ words: [gaol.id, tha.id], batch: 1 }));
    const first = nextCard(session, T0);
    expect(first).toMatchObject({ type: 'card', card: { exercise: 'recognise' } });
    const target = (first as { card: Card }).card.itemId;

    let r = answerCard(session, (first as { card: Card }).card, true, T0);
    expect(r.learned).toBeNull();
    session = r.session;
    const gaolCards = session.queue.filter((c) => c.itemId === target);
    expect(gaolCards).toHaveLength(1);
    expect(gaolCards[0].exercise).toBe('cloze');

    r = answerCard(session, gaolCards[0], true, T0 + 1000);
    expect(r.learned).toBe(target);
    expect(r.session.queue.some((c) => c.itemId === target)).toBe(false);
  });

  it('re-queues a miss for at least ten minutes and after the rest of the batch', () => {
    let session = past(startBatch({ words: [orm.id, ort.id], batch: 1 }));
    const missed = session.queue.find((c) => c.itemId === orm.id)!;
    session = answerCard(session, missed, false, T0).session;
    expect(session.queue.some((c) => c.itemId === orm.id)).toBe(false);

    // The other word is still due first.
    const n1 = nextCard(session, T0 + 1000);
    expect(n1).toMatchObject({ type: 'card', card: { itemId: ort.id } });
    session = answerCard(session, (n1 as { card: Card }).card, true, T0 + 1000).session;
    session = answerCard(session, session.queue.find((c) => c.itemId === ort.id)!, true, T0 + 2000).session;

    // Batch done, but ten minutes have not passed: wait.
    expect(nextCard(session, T0 + 3000)).toEqual({ type: 'wait', until: T0 + RELEARN_AFTER_MS });
    // Time passed: the missed card returns at the same rung.
    expect(nextCard(session, T0 + RELEARN_AFTER_MS)).toMatchObject({ type: 'card', card: { itemId: orm.id, exercise: 'recognise' } });
  });

  it('keeps a missed card out until its batch is finished, even after ten minutes', () => {
    let session = past(startBatch({ words: [orm.id, ort.id, heHasGaelic.id, youLoveMe.id], batch: 1 }));
    const missed = session.queue[0];
    session = answerCard(session, missed, false, T0).session;
    const n = nextCard(session, T0 + RELEARN_AFTER_MS + 1);
    expect(n).toMatchObject({ type: 'card' });
    expect((n as { card: Card }).card.itemId).not.toBe(missed.itemId);
  });

  it('is done when nothing is queued or waiting', () => {
    expect(nextCard(startBatch({ words: [], batch: 1 }), T0)).toEqual({ type: 'done' });
  });
});
