import { describe, expect, it } from 'vitest';
import { buildScarfView } from '../../../src/ui/screens/Scarf/scarfView';
import { ELLS_PER_KIND as ELLS_PER_ITEM } from '../../../src/app/services/length';
import { agam, gaol, iLoveYou, ort } from '../fixtures/slice';
import type { LearnableItem, Progress, Scarf } from '../../../src/domain/types';

const DAY = 86_400_000;
const now = 100 * DAY;

const scarf: Scarf = {
  id: 's1', name: 'Love', tagFilter: ['topic:love', 'prep:aig'], tartanId: 't', createdAt: 0, pausedAt: null,
  wovenOrder: [gaol.id, agam.id, ort.id, iLoveYou.id],
};
const items = new Map<string, LearnableItem>([gaol, agam, ort, iLoveYou].map((i) => [i.id, i]));
const row = (itemId: string, due: number, lastReview: number): Progress => ({
  itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 1,
  fsrs: { stability: 1, difficulty: 5, lastReview, due, reps: 1, lapses: 0 },
  ownerScarfId: 's1', wovenAt: 0, consecutiveMisses: 0, tangled: false,
});

describe('buildScarfView', () => {
  it('counts words, forms and sentences, and sums length by kind', () => {
    const v = buildScarfView({ scarf, items, progress: [], now });
    expect(v.counts).toEqual({ total: 4, words: 1, forms: 2, sentences: 1 });
    expect(v.ells).toBeCloseTo(ELLS_PER_ITEM.lexeme + 2 * ELLS_PER_ITEM.form + ELLS_PER_ITEM.sentence);
  });

  it('turns overdue woven items into holes carrying their Gaelic', () => {
    const v = buildScarfView({ scarf, items, progress: [row(gaol.id, now - 2 * DAY, now - 3 * DAY), row(agam.id, now + DAY, now - DAY)], now });
    expect(v.holes).toEqual([{ itemId: gaol.id, size: 'medium', gd: 'gaol' }]);
  });

  it('ignores progress for items that are not woven into this scarf', () => {
    const v = buildScarfView({ scarf, items, progress: [row('lex:other', now - DAY, now - 2 * DAY)], now });
    expect(v.holes).toEqual([]);
  });

  it('copes with an empty scarf', () => {
    const v = buildScarfView({ scarf: { ...scarf, wovenOrder: [] }, items, progress: [], now });
    expect(v.ells).toBe(0);
    expect(v.counts.total).toBe(0);
  });
});

describe('itemElls', () => {
  it('lists the cloth each woven item adds, in weaving order, for the ruler', () => {
    const v = buildScarfView({ scarf: { ...scarf, wovenOrder: [gaol.id, 'gone', iLoveYou.id] }, items, progress: [], now });
    // An item missing from the content adds no cloth, but keeps its place in the order.
    expect(v.itemElls).toEqual([ELLS_PER_ITEM.lexeme, 0, ELLS_PER_ITEM.sentence]);
  });
});
