import { describe, expect, it } from 'vitest';
import { mothHoles, type MothCandidate } from '../../src/domain/moths';

const DAY = 86_400_000;
const NOW = 1_000 * DAY;
const c = (itemId: string, overdueDays: number, intervalDays = 4): MothCandidate => ({
  itemId,
  due: NOW - overdueDays * DAY,
  lastIntervalMs: intervalDays * DAY,
});

describe('mothHoles', () => {
  it('makes no hole for items that are not yet due', () => {
    const r = mothHoles([c('a', -1)], NOW, { totalItems: 100 });
    expect(r).toEqual({ holes: [], extraMoths: 0 });
  });

  it('makes a small hole the moment an item is due', () => {
    const r = mothHoles([c('a', 0)], NOW, { totalItems: 100 });
    expect(r.holes).toEqual([{ itemId: 'a', size: 'small' }]);
  });

  it('grows to medium at 1x and large at 3x the last interval overdue', () => {
    const r = mothHoles([c('a', 3.9), c('b', 4), c('c', 11.9), c('d', 12)], NOW, { totalItems: 1000 });
    const sizes = Object.fromEntries(r.holes.map((h) => [h.itemId, h.size]));
    expect(sizes).toEqual({ a: 'small', b: 'medium', c: 'medium', d: 'large' });
  });

  it('lists the largest, most overdue hole first', () => {
    const r = mothHoles([c('a', 0), c('b', 20), c('c', 5)], NOW, { totalItems: 1000 });
    expect(r.holes.map((h) => h.itemId)).toEqual(['b', 'c', 'a']);
  });

  it('caps visible damage at about 15% and returns the overflow as extra moths', () => {
    const items = Array.from({ length: 20 }, (_, i) => c(`i${i}`, 30));
    const r = mothHoles(items, NOW, { totalItems: 20 });
    expect(r.holes.length).toBeLessThan(20);
    expect(r.holes.length + r.extraMoths).toBe(20);
    expect(r.extraMoths).toBeGreaterThan(0);
  });

  it('always shows at least one hole, even on a tiny scarf', () => {
    const r = mothHoles([c('a', 30), c('b', 30)], NOW, { totalItems: 2 });
    expect(r.holes).toHaveLength(1);
    expect(r.extraMoths).toBe(1);
  });

  it('copes with a zero interval', () => {
    const r = mothHoles([c('a', 1, 0)], NOW, { totalItems: 100 });
    expect(r.holes[0]?.size).toBe('large');
  });

  it('honours custom cap options', () => {
    const items = Array.from({ length: 10 }, (_, i) => c(`i${i}`, 0));
    const r = mothHoles(items, NOW, { totalItems: 10, capFraction: 1 });
    expect(r.holes).toHaveLength(10);
  });
});
