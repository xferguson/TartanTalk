import { describe, expect, it } from 'vitest';
import { bundleReviews, carrierFor, readyForTyped, wordsInContext, wordsNeedingSentences, SYNC_WINDOW_MS } from '../../src/domain/context';
import type { ItemId, LearnableItem, Progress } from '../../src/domain/types';
import { ALL_ITEMS, SENTENCES, agam, gaidhlig, gaol, iHaveGaelic, iLoveYou, ort, tha } from './fixtures/slice';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;
const items = new Map<ItemId, LearnableItem>(ALL_ITEMS.map((i) => [i.id, i]));

function row(itemId: ItemId, over: { due?: number; reps?: number; woven?: boolean; tangled?: boolean } = {}): Progress {
  const woven = over.woven ?? true;
  return {
    itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 1, ownerScarfId: 's',
    wovenAt: woven ? 1 : null, consecutiveMisses: 0, tangled: over.tangled ?? false,
    fsrs: { stability: 2, difficulty: 5, lastReview: NOW - DAY, due: over.due ?? NOW - 1, reps: over.reps ?? 1, lapses: 0 },
  };
}
const ready = new Set<ItemId>([tha.id, gaol.id, agam.id, ort.id, gaidhlig.id]);
const book = (...rows: Progress[]) => new Map(rows.map((r) => [r.itemId, r]));

describe('words proven in a sentence', () => {
  it('counts the words of learned sentences only', () => {
    const progress = book(row(iLoveYou.id), row(tha.id));
    const ctx = wordsInContext(SENTENCES, progress);
    expect([...ctx].sort()).toEqual([agam.id, gaol.id, ort.id, tha.id].sort());
    expect(ctx.has(gaidhlig.id)).toBe(false);
  });
});

describe('words that need a sentence', () => {
  it('lists woven words with a couple of reviews and no sentence yet, most reviewed first', () => {
    const progress = book(row(gaol.id, { reps: 2 }), row(gaidhlig.id, { reps: 3 }), row(tha.id, { reps: 1 }), row(agam.id, { reps: 2, woven: false }));
    expect(wordsNeedingSentences(ALL_ITEMS, progress)).toEqual([gaidhlig.id, gaol.id]);
  });

  it('ignores words already proven in a sentence, and sentences themselves', () => {
    const progress = book(row(iLoveYou.id, { reps: 5 }), row(gaol.id, { reps: 4 }));
    expect(wordsNeedingSentences(ALL_ITEMS, progress)).toEqual([]);
  });
});

describe('bundling reviews into full sentences', () => {
  const learnedLove = [row(iLoveYou.id, { due: NOW + 30 * DAY })];

  it('reviews several due words through one sentence, covering all of them', () => {
    const progress = book(...learnedLove, row(tha.id), row(gaol.id), row(agam.id));
    const units = bundleReviews({ due: [tha.id, gaol.id, agam.id], items, progress, scope: new Set(progress.keys()), typedReady: ready, now: NOW });
    expect(units).toHaveLength(1);
    expect(units[0].itemId).toBe(iLoveYou.id);
    expect([...units[0].covers].sort()).toEqual([agam.id, gaol.id, tha.id]);
  });

  it('syncs in words that fall due soon, but not ones far off or tangled', () => {
    const progress = book(
      ...learnedLove, row(tha.id), row(gaol.id, { due: NOW + SYNC_WINDOW_MS - 1 }),
      row(agam.id, { due: NOW + SYNC_WINDOW_MS + DAY }), row(ort.id, { tangled: true, due: NOW + 1 }),
    );
    const [unit] = bundleReviews({ due: [tha.id], items, progress, scope: new Set(progress.keys()), typedReady: ready, now: NOW });
    expect([...unit.covers].sort()).toEqual([gaol.id, tha.id]);
  });

  it('includes the carrier sentence when it is due too, so it is not asked twice', () => {
    const progress = book(row(iLoveYou.id), row(gaol.id));
    const units = bundleReviews({ due: [iLoveYou.id, gaol.id], items, progress, scope: new Set(progress.keys()), typedReady: ready, now: NOW });
    expect(units).toHaveLength(1);
    expect(units[0].itemId).toBe(iLoveYou.id);
    expect([...units[0].covers].sort()).toEqual([gaol.id, iLoveYou.id]);
  });

  it('leaves a word with no sentence as its own review, and keeps most overdue first', () => {
    const progress = book(...learnedLove, row(gaidhlig.id), row(gaol.id), row(tha.id));
    const units = bundleReviews({ due: [gaidhlig.id, gaol.id, tha.id], items, progress, scope: new Set(progress.keys()), typedReady: ready, now: NOW });
    expect(units.map((u) => u.itemId)).toEqual([gaidhlig.id, iLoveYou.id]);
    expect(units[0].covers).toEqual([gaidhlig.id]);
  });

  it('prefers the sentence that covers the most due words', () => {
    const progress = book(row(iLoveYou.id, { due: NOW + 30 * DAY }), row(iHaveGaelic.id, { due: NOW + 30 * DAY }), row(tha.id), row(gaidhlig.id), row(agam.id));
    const [unit] = bundleReviews({ due: [tha.id, gaidhlig.id, agam.id], items, progress, scope: new Set(progress.keys()), typedReady: ready, now: NOW });
    expect(unit.itemId).toBe(iHaveGaelic.id);
    expect(unit.covers).toHaveLength(3);
  });
});

describe('the ratchet', () => {
  const ev = (itemId: string, exercise: 'recognise' | 'cloze' | 'produce', rating: 'again' | 'good', implicit = false) =>
    ({ itemId, at: 1, exercise, rating, implicit, weight: 1 });

  it('promotes a word to typed sentences once it passes a cloze in review, and never demotes it', () => {
    const log = [ev(gaol.id, 'cloze', 'good'), ev(tha.id, 'cloze', 'again'), ev(agam.id, 'cloze', 'good', true), ev(ort.id, 'produce', 'good'), ev(gaol.id, 'cloze', 'again')];
    expect([...readyForTyped(log)]).toEqual([gaol.id]);
  });

  it('keeps words that are not ready out of typed bundles', () => {
    const progress = book(row(iLoveYou.id, { due: NOW + 30 * DAY }), row(tha.id), row(gaol.id));
    const units = bundleReviews({ due: [tha.id, gaol.id], items, progress, scope: new Set(progress.keys()), typedReady: new Set([tha.id]), now: NOW });
    expect(units.map((u) => u.covers)).toEqual([[tha.id], [gaol.id]].map((c) => expect.arrayContaining(c)));
    expect(units.find((u) => u.itemId === gaol.id)?.covers).toEqual([gaol.id]);
  });

  it('picks the learned sentence reviewed longest ago as the carrier', () => {
    const progress = book(row(iLoveYou.id), row(iHaveGaelic.id));
    progress.set(iLoveYou.id, { ...progress.get(iLoveYou.id)!, fsrs: { ...progress.get(iLoveYou.id)!.fsrs!, lastReview: 5 } });
    progress.set(iHaveGaelic.id, { ...progress.get(iHaveGaelic.id)!, fsrs: { ...progress.get(iHaveGaelic.id)!.fsrs!, lastReview: 1 } });
    expect(carrierFor(tha.id, SENTENCES, progress)?.id).toBe(iHaveGaelic.id);
    expect(carrierFor(gaidhlig.id, SENTENCES, new Map())).toBeUndefined();
  });
});
