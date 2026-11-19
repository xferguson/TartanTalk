import { describe, expect, it } from 'vitest';
import {
  clampOffset,
  clothEnds,
  geometry,
  layoutBands,
  maxOffset,
  offsetToCentre,
  perchHole,
  placeHoles,
  rulerMarks,
  splitHoles,
  visibleBands,
  wovenRect,
} from '../../../src/weave/layout';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `i${i}`);
const detail = geometry('detail');
const strip = geometry('strip', 300);

describe('the window onto a long scarf', () => {
  it('only moves once the cloth is longer than the window', () => {
    expect(maxOffset(40, detail)).toBe(0); // 40 × 9 = 360, exactly fits
    expect(maxOffset(41, detail)).toBe(9);
    expect(maxOffset(17, strip)).toBe(0); // 17 × 16 = 272 of 280
    expect(maxOffset(20, strip)).toBe(40);
  });

  it('clamps the offset to the cloth', () => {
    expect(clampOffset(-5, 100, detail)).toBe(0);
    expect(clampOffset(50, 100, detail)).toBe(50);
    expect(clampOffset(9999, 100, detail)).toBe(540);
    expect(clampOffset(30, 10, detail)).toBe(0);
  });

  it('shifts the detail bands by the offset, older cloth coming up from below', () => {
    const bands = layoutBands(ids(100), detail, 90);
    expect(bands[99].rect.y).toBe(10 - 90);
    expect(bands[89].rect.y).toBe(10);
  });

  it('lists only the bands in view', () => {
    const inView = visibleBands(ids(100), detail, 90);
    expect(inView[0].index).toBe(50);
    expect(inView[inView.length - 1].index).toBe(89);
    expect(inView).toHaveLength(40);
    const part = visibleBands(ids(100), detail, 4);
    expect(part.map((b) => b.index)).toContain(99); // a band cut by the edge still counts
  });

  it('clips the woven cloth to the window', () => {
    expect(wovenRect(100, detail, 90)).toEqual({ x: 4, y: 10, w: 56, h: 360 });
    expect(wovenRect(3, detail, 0)).toEqual({ x: 4, y: 10, w: 56, h: 27 });
    expect(wovenRect(100, strip)).toEqual({ x: 10, y: 0, w: 280, h: 44 });
  });

  it('says which ends of the cloth are in view', () => {
    expect(clothEnds(10, detail, 0)).toEqual({ newest: true, oldest: true });
    expect(clothEnds(100, detail, 0)).toEqual({ newest: true, oldest: false });
    expect(clothEnds(100, detail, 200)).toEqual({ newest: false, oldest: false });
    expect(clothEnds(100, detail, 540)).toEqual({ newest: false, oldest: true });
    expect(clothEnds(100, strip)).toEqual({ newest: true, oldest: false });
    expect(clothEnds(0, detail, 0)).toEqual({ newest: false, oldest: false });
  });
});

describe('holes on a long scarf', () => {
  const order = ids(100);
  const holes = [
    { itemId: 'i99', size: 'small' as const }, // newest band
    { itemId: 'i60', size: 'large' as const },
    { itemId: 'i10', size: 'medium' as const },
    { itemId: 'i5', size: 'small' as const },
  ];

  it('keeps each hole on its own band as the window moves', () => {
    const at0 = placeHoles(holes, order, detail, 0);
    const at90 = placeHoles(holes, order, detail, 90);
    const cy = (ps: typeof at0, id: string) => ps.find((p) => p.itemId === id)?.cy ?? NaN;
    expect(cy(at0, 'i60') - cy(at90, 'i60')).toBe(90);
  });

  it('splits holes into those in view and those beyond each end, nearest first', () => {
    const split = splitHoles(placeHoles(holes, order, detail, 90), detail);
    expect(split.visible.map((p) => p.itemId)).toEqual(['i60']);
    expect(split.newer.map((p) => p.itemId)).toEqual(['i99']);
    expect(split.older.map((p) => p.itemId)).toEqual(['i10', 'i5']);
  });

  it('treats the strip as showing its newest end, with older holes off to the left', () => {
    const split = splitHoles(placeHoles(holes, order, strip), strip);
    expect(split.visible.map((p) => p.itemId)).toEqual(['i99']);
    expect(split.older.map((p) => p.itemId)).toEqual(['i60', 'i10', 'i5']);
    expect(split.newer).toEqual([]);
  });

  it('finds the offset that brings a hole to the middle of the window', () => {
    const placed = placeHoles(holes, order, detail, 90);
    const hole = placed.find((p) => p.itemId === 'i60');
    if (!hole) throw new Error('hole missing');
    const target = offsetToCentre(hole, order.length, detail, 90);
    expect(target).toBeCloseTo(175.5);
    const moved = placeHoles(holes, order, detail, target).find((p) => p.itemId === 'i60');
    expect(moved?.cy).toBeCloseTo(10 + 180);
    const oldest = placed.find((p) => p.itemId === 'i5');
    if (!oldest) throw new Error('hole missing');
    expect(offsetToCentre(oldest, order.length, detail, 90)).toBe(540); // clamped at the oldest end
  });
});

describe('where the moth perches on a long scarf', () => {
  it('skips a hole in a faded edge, where the moth would be hidden behind the fade and its marker', () => {
    const order = ids(60);
    const holes = [
      { itemId: 'i43', size: 'large' as const }, // just inside the strip's faded left edge
      { itemId: 'i59', size: 'small' as const },
    ];
    const visible = splitHoles(placeHoles(holes, order, strip), strip).visible;
    expect(visible.map((p) => p.itemId)).toEqual(['i43', 'i59']);
    expect(perchHole(visible, order.length, strip, 0)?.itemId).toBe('i59');
  });

  it('perches by the largest hole while the cloth fits', () => {
    const order = ids(3);
    const visible = splitHoles(placeHoles([{ itemId: 'i0', size: 'large' }, { itemId: 'i2', size: 'small' }], order, strip), strip).visible;
    expect(perchHole(visible, order.length, strip, 0)?.itemId).toBe('i0');
  });
});

describe('rulerMarks', () => {
  it('marks 0 at the oldest end and the total at the newest end', () => {
    const marks = rulerMarks([0.25, 0.25, 0.25, 0.25], 9);
    expect(marks[0]).toEqual({ text: '0', y: 36 });
    expect(marks.at(-1)).toEqual({ text: '1', y: 0 });
  });

  it('places each half ell where the cumulative length reaches it, interpolating within a band', () => {
    // Oldest first: 0.2, 0.4, 0.4 ells, 100px each. 0.5 is reached three quarters of the way
    // through the second band, which runs from y 200 (its older edge) to y 100.
    const marks = rulerMarks([0.2, 0.4, 0.4], 100);
    expect(marks.map((m) => m.text)).toEqual(['0', '0.5', '1']);
    expect(marks[1].y).toBeCloseTo(125);
  });

  it('drops a mark that would crowd the total', () => {
    const marks = rulerMarks(Array.from({ length: 13 }, () => 0.04), 9); // 0.52 ells, 117px
    expect(marks.map((m) => m.text)).toEqual(['0', '0.52']);
  });

  it('gives a lone 0 for an empty scarf', () => {
    expect(rulerMarks([], 9)).toEqual([{ text: '0', y: 0 }]);
  });
});
