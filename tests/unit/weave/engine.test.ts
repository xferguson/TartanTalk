import { describe, expect, it } from 'vitest';
import { hash, seedOf } from '../../../src/weave/hash';
import { hexToRgb, parseSett, threadColours } from '../../../src/weave/sett';
import { twillPixels } from '../../../src/weave/twill';
import { geometry, layoutBands, mothPosition, placeHoles, textAlternative } from '../../../src/weave/layout';

describe('hash', () => {
  it('is deterministic and within 0..1', () => {
    expect(hash(3, 7)).toBe(hash(3, 7));
    for (let i = 0; i < 50; i++) {
      const v = hash(i, i * 3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(hash(1, 2)).not.toBe(hash(2, 1));
  });
  it('seeds ids stably', () => {
    expect(seedOf('lex:gaol')).toBe(seedOf('lex:gaol'));
    expect(seedOf('lex:gaol')).not.toBe(seedOf('lex:air'));
  });
});

describe('parseSett', () => {
  it('mirrors a symmetric sett without repeating the pivots', () => {
    expect(parseSett('B/2 R1 G/2')).toEqual(['B', 'B', 'R', 'G', 'G', 'R']);
  });
  it('repeats an asymmetric sett as written', () => {
    expect(parseSett('B2 R1 G3')).toEqual(['B', 'B', 'R', 'G', 'G', 'G']);
  });
  it('treats a pivot only at the end as symmetric', () => {
    expect(parseSett('B2 R1 G/2')).toEqual(['B', 'B', 'R', 'G', 'G', 'R']);
  });
  it('scales thread counts with a minimum of 1', () => {
    expect(parseSett('B30 R4', 0.1)).toEqual(['B', 'B', 'B', 'R']);
  });
  it('rejects malformed stripes', () => {
    expect(() => parseSett('B/30 oops')).toThrow(/oops/);
  });
  it('falls back to neutral wool for unknown colour codes', () => {
    expect(threadColours('Q2', {})).toHaveLength(2);
    expect(hexToRgb('#0b5a3a')).toEqual([11, 90, 58]);
  });
});

describe('twillPixels', () => {
  const threads = [hexToRgb('#ff0000'), hexToRgb('#0000ff'), hexToRgb('#00ff00'), hexToRgb('#ffff00')];
  const { size, data } = twillPixels(threads, 2);
  const px = (X: number, Y: number) => Array.from(data.slice((Y * size + X) * 4, (Y * size + X) * 4 + 3));

  it('is a square tile of threads * tpx', () => {
    expect(size).toBe(8);
    expect(data).toHaveLength(8 * 8 * 4);
  });
  it('shows warp where ((x+y)&3)<2 and weft otherwise', () => {
    // thread (0,0) is warp -> thread 0 (red); thread (2,0) is weft -> thread y=0 (red); thread (1,2): warp? (1+2)&3=3 -> weft -> thread y=2 (green)
    expect(px(0, 0)[0]).toBeGreaterThan(200);
    const weft = px(2, 4); // x=1,y=2
    expect(weft[1]).toBeGreaterThan(weft[0]);
  });
  it('is deterministic', () => {
    expect(Array.from(twillPixels(threads, 2).data)).toEqual(Array.from(data));
  });
});

describe('layout', () => {
  it('has the specified canvas geometry', () => {
    const s = geometry('strip', 300);
    expect(s.height).toBe(44);
    expect(s.cloth).toEqual({ x: 10, y: 0, w: 280, h: 44 });
    const d = geometry('detail');
    expect([d.width, d.height]).toEqual([64, 380]);
    expect(d.cloth).toEqual({ x: 4, y: 10, w: 56, h: 360 });
  });
  it('lays detail bands 9px high in weaving order, squeezing when full', () => {
    const d = geometry('detail');
    const bands = layoutBands(['a', 'b', 'c'], d);
    expect(bands.map((b) => b.rect.y)).toEqual([10, 19, 28]);
    expect(bands[0].rect.h).toBe(9);
    const many = layoutBands(Array.from({ length: 90 }, (_, i) => `i${i}`), d);
    expect(many[89].rect.y + many[89].rect.h).toBeCloseTo(370);
  });
  it('places holes on their item band, largest first, with radii by variant', () => {
    const d = geometry('detail');
    const placed = placeHoles(
      [{ itemId: 'b', size: 'small' }, { itemId: 'a', size: 'large' }],
      ['a', 'b'],
      d,
    );
    expect(placed.map((p) => p.itemId)).toEqual(['a', 'b']);
    expect(placed[0].r).toBe(8);
    expect(placed[1].r).toBe(5);
    expect(placed[0].cy).toBeCloseTo(14.5);
    const strip = placeHoles([{ itemId: 'a', size: 'medium' }], ['a'], geometry('strip'));
    expect(strip[0].r).toBe(5);
  });
  it('perches the moth beside the first hole', () => {
    expect(mothPosition({ itemId: 'a', size: 'large', cx: 22, cy: 120, r: 6, seed: 1 })).toEqual({ x: 41, y: 116, size: 22 });
    expect(mothPosition({ itemId: 'a', size: 'large', cx: 22, cy: 5, r: 6, seed: 1 }).y).toBe(13);
  });
  it('words the text alternative', () => {
    expect(textAlternative('Love', '2.4 ells', 2)).toBe('Love, 2.4 ells, 2 moth holes');
    expect(textAlternative('Love', '2.4 ells', 1)).toBe('Love, 2.4 ells, 1 moth hole');
    expect(textAlternative('Love', '0 ells', 0)).toBe('Love, 0 ells, 0 moth holes');
  });
});
