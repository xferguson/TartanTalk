import { describe, expect, it } from 'vitest';
import { candidateItems, isUnlocked, matchesFilter, newlyUnlocked, scarfPreview } from '../../src/domain/unlock';
import type { Progress } from '../../src/domain/types';
import { ALL_ITEMS, SENTENCES, agam, gaidhlig, gaol, iHaveGaelic, iLoveYou, ort, tha, youHaveGaelic } from './fixtures/slice';

const learnedSet = (...ids: string[]) => new Set(ids);

function learnedProgress(itemId: string, owner: string): Progress {
  return {
    itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 1, ownerScarfId: owner,
    wovenAt: 1, consecutiveMisses: 0, tangled: false,
    fsrs: { stability: 1, difficulty: 5, lastReview: 1, due: 2, reps: 1, lapses: 0 },
  };
}

describe('sentence unlocking', () => {
  it('unlocks a sentence only when every tracked word in it is learned', () => {
    expect(isUnlocked(iLoveYou, learnedSet(tha.id, gaol.id, agam.id))).toBe(false);
    expect(isUnlocked(iLoveYou, learnedSet(tha.id, gaol.id, agam.id, ort.id))).toBe(true);
  });

  it('ignores untracked tokens such as punctuation', () => {
    const withPunctuation = { ...iHaveGaelic, tokens: [...iHaveGaelic.tokens, { text: '.', itemId: null }] };
    expect(isUnlocked(withPunctuation, learnedSet(tha.id, gaidhlig.id, agam.id))).toBe(true);
  });

  it('reports the sentences a newly learned word opens up', () => {
    const before = learnedSet(tha.id, gaidhlig.id, 'form:aig.2sg');
    const after = new Set([...before, agam.id]);
    expect(newlyUnlocked(SENTENCES, before, after).map((s) => s.id)).toEqual([iHaveGaelic.id]);
    expect(newlyUnlocked(SENTENCES, before, before)).toEqual([]);
    expect(isUnlocked(youHaveGaelic, before)).toBe(true);
  });
});

describe('scarf filters', () => {
  it('matches items sharing any tag with the scarf filter', () => {
    expect(matchesFilter(gaol, ['topic:love'])).toBe(true);
    expect(matchesFilter(gaidhlig, ['topic:love'])).toBe(false);
    expect(matchesFilter(agam, ['prep:aig', 'topic:love'])).toBe(true);
  });

  it('feeds a scarf only items that are not yet learned, including new sentences of known words', () => {
    const progress = new Map([[tha.id, learnedProgress(tha.id, 'love')], [agam.id, learnedProgress(agam.id, 'love')]]);
    const ids = candidateItems(ALL_ITEMS, ['topic:languages', 'prep:aig', 'grammar:tha'], progress).map((i) => i.id);
    expect(ids).not.toContain(tha.id);
    expect(ids).not.toContain(agam.id);
    expect(ids).toContain(gaidhlig.id);
    expect(ids).toContain(iHaveGaelic.id);
  });

  it('previews new items and those already woven in other scarves', () => {
    const progress = new Map([[agam.id, learnedProgress(agam.id, 'love')], [gaol.id, learnedProgress(gaol.id, 'love')]]);
    const preview = scarfPreview(ALL_ITEMS, ['prep:aig'], progress);
    // aig-tagged items: agam, agad, aige + 6 sentences (all tagged prep:aig) = 9; agam is woven elsewhere.
    expect(preview).toEqual({ newItems: 8, wovenElsewhere: 1 });
  });
});
