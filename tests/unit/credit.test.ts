import { describe, expect, it } from 'vitest';
import { implicitCredit, type CreditScheduler } from '../../src/domain/credit';
import type { FsrsState, ItemId, Progress, Sentence } from '../../src/domain/types';

const fsrs = (stability: number): FsrsState => ({ stability, difficulty: 5, lastReview: 0, due: 0, reps: 3, lapses: 0 });
const prog = (itemId: ItemId, f: FsrsState | null): Progress => ({
  itemId, phase: f ? 'review' : 'learning', correctInSession: 0, ladderStep: 0, seededStep: 3,
  fsrs: f, ownerScarfId: null, wovenAt: null, consecutiveMisses: 0, tangled: false,
});
const sentence: Sentence = {
  kind: 'sentence', id: 'sent:1', gd: 'Tha gaol agam ort', en: 'I love you', altGd: [],
  tokens: [
    { text: 'Tha', itemId: 'lex:tha' }, { text: 'gaol', itemId: 'lex:gaol' },
    { text: 'agam', itemId: 'form:aig.1sg' }, { text: 'ort', itemId: 'form:air.2sg' },
    { text: '.', itemId: null }, { text: 'gaol', itemId: 'lex:gaol' },
  ],
  pattern: 'p', tags: [], source: { ref: 'x', licence: 'x' }, review: 'verified',
};
const sched = (r: Record<string, number>): CreditScheduler => ({
  retrievability: (f) => r[String(f.stability)] ?? 0.5,
  goodStability: (f) => f.stability * 2,
});
const map = (...p: Progress[]) => new Map(p.map((x) => [x.itemId, x]));

describe('implicitCredit', () => {
  it('typed sentence gives full weight to every reviewed token item once, even if not slipping', () => {
    const p = map(prog('lex:tha', fsrs(10)), prog('lex:gaol', fsrs(4)), prog('form:aig.1sg', fsrs(2)));
    const out = implicitCredit({ exercise: 'produce', sentence }, p, 0, sched({ '10': 0.99 }));
    expect(out.map((c) => c.itemId)).toEqual(['lex:tha', 'lex:gaol', 'form:aig.1sg']);
    expect(out.every((c) => c.weight === 1)).toBe(true);
    expect(out[0].stability).toBe(20);
  });

  it('skips items with no FSRS state', () => {
    const out = implicitCredit({ exercise: 'produce', sentence }, map(prog('lex:tha', null)), 0, sched({}));
    expect(out).toEqual([]);
  });

  it('cloze excludes the target and gives 0.25 weight to slipping others', () => {
    const p = map(prog('lex:tha', fsrs(8)), prog('lex:gaol', fsrs(4)));
    const out = implicitCredit({ exercise: 'cloze', sentence, targetId: 'lex:gaol' }, p, 0, sched({ '8': 0.5 }));
    expect(out).toEqual([{ itemId: 'lex:tha', weight: 0.25, stability: 8 + 0.25 * 8 }]);
  });

  it('cloze gives nothing to others with retrievability at or above 0.9', () => {
    const p = map(prog('lex:tha', fsrs(8)), prog('form:aig.1sg', fsrs(6)));
    const out = implicitCredit({ exercise: 'cloze', sentence, targetId: 'lex:gaol' }, p, 0, sched({ '8': 0.9, '6': 0.95 }));
    expect(out).toEqual([]);
  });

  it('is positive-only: stability never drops below its current value', () => {
    const weak: CreditScheduler = { retrievability: () => 0.1, goodStability: () => 1 };
    const out = implicitCredit({ exercise: 'produce', sentence }, map(prog('lex:tha', fsrs(10))), 0, weak);
    expect(out[0].stability).toBe(10);
  });
});
