import { describe, expect, it } from 'vitest';
import { buildEntry, holeChipText, sortByLastWorked, summarise, visitorsText } from '../../../src/ui/screens/Shelf/shelfModel';
import type { Progress, Scarf } from '../../../src/domain/types';

const DAY = 86_400_000;
const now = 100 * DAY;
const scarf = (id: string, wovenOrder: string[], createdAt = 0): Scarf => ({
  id, name: id, tagFilter: [], tartanId: 't', createdAt, pausedAt: null, wovenOrder,
});
const prog = (itemId: string, due: number, wovenAt = 1): Progress => ({
  itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 3, ownerScarfId: 's',
  wovenAt, consecutiveMisses: 0, tangled: false,
  fsrs: { stability: 1, difficulty: 5, lastReview: due - DAY, due, reps: 1, lapses: 0 },
});

describe('buildEntry', () => {
  it('sums length by item kind and finds overdue holes', () => {
    const e = buildEntry(scarf('s', ['lex:a', 'form:b', 'sent:c']), [prog('lex:a', now - DAY), prog('form:b', now + DAY), prog('sent:c', now + DAY)], now);
    expect(e.ells).toBeCloseTo(0.11);
    expect(e.holes.map((h) => h.itemId)).toEqual(['lex:a']);
  });
  it('ignores progress for items not woven into the scarf', () => {
    expect(buildEntry(scarf('s', ['lex:a']), [prog('lex:z', now - DAY)], now).holes).toEqual([]);
  });
});

describe('shelf summary', () => {
  const calm = buildEntry(scarf('calm', ['lex:a']), [prog('lex:a', now + DAY)], now);
  const one = buildEntry(scarf('one', ['lex:a']), [prog('lex:a', now - DAY)], now);
  it('orders by most recently worked', () => {
    const recent = { ...calm, lastWorked: 50 };
    expect(sortByLastWorked([{ ...one, lastWorked: 10 }, recent]).map((e) => e.lastWorked)).toEqual([50, 10]);
  });
  it('greets by time of day and counts scarves with holes', () => {
    expect(summarise([calm, one], 9).greeting.gd).toBe('Madainn mhath!');
    expect(summarise([calm, one], 12).greeting.gd).toBe('Feasgar math!');
    const s = summarise([calm, one], 9);
    expect(s.scarvesWithHoles).toBe(1);
    expect(s.reweaveTarget?.scarf.id).toBe('one');
    expect(summarise([calm], 9).reweaveTarget).toBeNull();
  });
  it('words the counts', () => {
    expect(visitorsText(0)).toBe('');
    expect(visitorsText(1)).toBe('1 scarf has visitors.');
    expect(visitorsText(3)).toBe('3 scarves have visitors.');
    expect(holeChipText(1)).toBe('1 moth hole');
    expect(holeChipText(2)).toBe('2 moth holes');
  });
});
