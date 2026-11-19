import type { ItemId, MothHole, MothSize } from '../domain/types';
import { hash, seedOf } from './hash';

export type ScarfVariant = 'strip' | 'detail';

export interface Rect { x: number; y: number; w: number; h: number }

export interface Geometry {
  variant: ScarfVariant;
  width: number;
  height: number;
  cloth: Rect;
  /** Device-independent px per thread. */
  threadPx: number;
}

const STRIP_HEIGHT = 44;
const STRIP_INSET = 10; // room for the fringe at each end
const DETAIL = { width: 64, height: 380, cloth: { x: 4, y: 10, w: 56, h: 360 } };
export const DETAIL_BAND_HEIGHT = 9;

/** `width` is only used by the strip, which fills its card. The detail scarf is fixed at 64x380. */
export function geometry(variant: ScarfVariant, width = 280): Geometry {
  if (variant === 'strip') {
    return { variant, width, height: STRIP_HEIGHT, cloth: { x: STRIP_INSET, y: 0, w: width - 2 * STRIP_INSET, h: STRIP_HEIGHT }, threadPx: 2 };
  }
  return { variant, ...DETAIL, threadPx: 2 };
}

export interface Band { index: number; itemId: ItemId; rect: Rect }

/** Strip width one woven item adds. */
export const STRIP_BAND_WIDTH = 16;

/** Bands keep their size however long the scarf grows (B13), so learning more always shows. */
export const bandPx = (g: Geometry): number => (g.variant === 'strip' ? STRIP_BAND_WIDTH : DETAIL_BAND_HEIGHT);

/** Length of the cloth area on screen: the window the scarf is seen through. */
export const viewSpan = (g: Geometry): number => (g.variant === 'strip' ? g.cloth.w : g.cloth.h);

export const clothLength = (count: number, g: Geometry): number => count * bandPx(g);

/**
 * `offset` is how far the window has moved from the newest end towards the oldest, in px.
 * It is 0 while the cloth fits.
 */
export const maxOffset = (count: number, g: Geometry): number => Math.max(0, clothLength(count, g) - viewSpan(g));

export const clampOffset = (offset: number, count: number, g: Geometry): number =>
  Math.min(maxOffset(count, g), Math.max(0, offset));

/**
 * Screen position (y on the detail scarf, x on the strip) of the point `d` px along the
 * cloth from its newest end. The detail scarf hangs with its newest band at the top; the
 * strip is woven left to right and, once it overflows, shows its newest end.
 */
function screenAt(d: number, count: number, g: Geometry, offset: number): number {
  if (g.variant === 'detail') return g.cloth.y + d - offset;
  return g.cloth.x + Math.min(clothLength(count, g), viewSpan(g)) + offset - d;
}

/** Cloth distance from the newest end of a screen position: the inverse of `screenAt`. */
function clothAt(pos: number, count: number, g: Geometry, offset: number): number {
  if (g.variant === 'detail') return pos - g.cloth.y + offset;
  return g.cloth.x + Math.min(clothLength(count, g), viewSpan(g)) + offset - pos;
}

/**
 * The woven part of the cloth inside the window. An empty scarf has none, and it grows by
 * one band per woven item; once longer than the window it is clipped to it.
 */
export function wovenRect(count: number, g: Geometry, offset = 0): Rect {
  const c = g.cloth;
  const a = screenAt(0, count, g, offset);
  const b = screenAt(clothLength(count, g), count, g, offset);
  const lo = g.variant === 'strip' ? c.x : c.y;
  const from = Math.max(lo, Math.min(a, b));
  const to = Math.min(lo + viewSpan(g), Math.max(a, b));
  const size = Math.max(0, to - from);
  return g.variant === 'strip' ? { ...c, x: count === 0 ? c.x : from, w: size } : { ...c, y: count === 0 ? c.y : from, h: size };
}

/** One band per woven item, in screen coordinates for the given window `offset`. */
export function layoutBands(order: ItemId[], g: Geometry, offset = 0): Band[] {
  const n = order.length;
  const size = bandPx(g);
  return order.map((itemId, index) => {
    const newerEdge = screenAt((n - 1 - index) * size, n, g, offset);
    const rect =
      g.variant === 'strip'
        ? { x: newerEdge - size, y: g.cloth.y, w: size, h: g.cloth.h }
        : { x: g.cloth.x, y: newerEdge, w: g.cloth.w, h: size };
    return { index, itemId, rect };
  });
}

/** Bands at least partly inside the window, oldest first. */
export function visibleBands(order: ItemId[], g: Geometry, offset = 0): Band[] {
  const c = g.cloth;
  return layoutBands(order, g, offset).filter(({ rect: r }) =>
    g.variant === 'strip' ? r.x < c.x + c.w && r.x + r.w > c.x : r.y < c.y + c.h && r.y + r.h > c.y,
  );
}

const EPS = 0.5;

/** Which ends of the cloth are in the window: they get a fringe, and the others an edge fade. */
export function clothEnds(count: number, g: Geometry, offset = 0): { newest: boolean; oldest: boolean } {
  if (count === 0) return { newest: false, oldest: false };
  const o = clampOffset(offset, count, g);
  return { newest: o <= EPS, oldest: o >= maxOffset(count, g) - EPS };
}

const HOLE_RADIUS: Record<ScarfVariant, Record<MothSize, number>> = {
  strip: { small: 3.5, medium: 5, large: 7 },
  detail: { small: 5, medium: 6, large: 8 },
};
const SIZE_RANK: Record<MothSize, number> = { large: 0, medium: 1, small: 2 };

export interface HolePlacement { itemId: ItemId; size: MothSize; cx: number; cy: number; r: number; seed: number }

/**
 * Where each hole sits: on its item's band when woven, with a stable offset across the cloth.
 * Largest holes come first, because the moth perches beside the first one.
 */
export function placeHoles(holes: MothHole[], order: ItemId[], g: Geometry, offset = 0): HolePlacement[] {
  const bands = new Map(layoutBands(order, g, offset).map((b) => [b.itemId, b]));
  const placed = holes.map((hole) => {
    const seed = seedOf(hole.itemId);
    const band = bands.get(hole.itemId);
    const along = hash(seed, 3); // stable fallback for an item not in the weaving order
    const across = 0.25 + hash(seed, 5) * 0.5;
    const r = HOLE_RADIUS[g.variant][hole.size];
    const c = g.cloth;
    let cx: number;
    let cy: number;
    if (g.variant === 'strip') {
      cx = band ? band.rect.x + band.rect.w / 2 : c.x + along * c.w;
      cy = c.y + (0.3 + across * 0.4) * c.h;
    } else {
      cx = c.x + across * c.w;
      cy = band ? band.rect.y + band.rect.h / 2 : c.y + along * c.h;
    }
    return { itemId: hole.itemId, size: hole.size, cx, cy, r, seed: seed % 1000 };
  });
  return placed.sort((a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size]);
}

export interface HoleSplit {
  /** Holes whose centre is in the window, largest first (the moth perches by the first). */
  visible: HolePlacement[];
  /** Beyond the newest-end edge of the window, nearest first. */
  newer: HolePlacement[];
  /** Beyond the oldest-end edge of the window, nearest first. */
  older: HolePlacement[];
}

/** Holes stay on their own band (B13): this only sorts them by where they sit relative to the window. */
export function splitHoles(placed: HolePlacement[], g: Geometry): HoleSplit {
  const c = g.cloth;
  const split: HoleSplit = { visible: [], newer: [], older: [] };
  for (const p of placed) {
    if (g.variant === 'detail') {
      if (p.cy < c.y) split.newer.push(p);
      else if (p.cy > c.y + c.h) split.older.push(p);
      else split.visible.push(p);
    } else if (p.cx < c.x) split.older.push(p);
    else if (p.cx > c.x + c.w) split.newer.push(p);
    else split.visible.push(p);
  }
  // Nearest first: by distance from the window, which is the same on both sides of it.
  const along = (p: HolePlacement) => (g.variant === 'detail' ? p.cy : p.cx);
  const lo = g.variant === 'detail' ? c.y : c.x;
  const gap = (p: HolePlacement) => Math.max(lo - along(p), along(p) - (lo + viewSpan(g)));
  split.newer.sort((a, b) => gap(a) - gap(b));
  split.older.sort((a, b) => gap(a) - gap(b));
  return split;
}

/** The window offset that puts a hole in the middle of the window, clamped to the cloth. */
export function offsetToCentre(p: HolePlacement, count: number, g: Geometry, offset: number): number {
  const d = clothAt(g.variant === 'detail' ? p.cy : p.cx, count, g, offset);
  return clampOffset(d - viewSpan(g) / 2, count, g);
}

export interface RulerMark {
  text: string;
  /** Cloth px from the newest end. */
  y: number;
}

const RULER_CROWD_PX = 14;
const roundElls = (v: number) => String(Math.round(v * 100) / 100);

/**
 * Ruler marks at 0, every half ell and the exact total, placed where the cloth reaches that
 * length counting from the oldest band. `itemElls` is in weaving order (oldest first).
 */
export function rulerMarks(itemElls: readonly number[], bandSize: number): RulerMark[] {
  const n = itemElls.length;
  const total = itemElls.reduce((a, b) => a + b, 0);
  if (n === 0 || total <= 0) return [{ text: '0', y: 0 }];
  const yAt = (v: number): number => {
    let before = 0;
    for (let i = 0; i < n; i++) {
      const e = itemElls[i] ?? 0;
      if (e > 0 && v <= before + e + 1e-9) return (n - i) * bandSize - ((v - before) / e) * bandSize;
      before += e;
    }
    return 0;
  };
  const marks: RulerMark[] = [];
  for (let v = 0; v < total - 0.005; v += 0.5) marks.push({ text: roundElls(v), y: yAt(v) });
  // A mark this close to the total would print over it.
  const kept = marks.filter((m) => m.y >= RULER_CROWD_PX);
  return [...kept, { text: roundElls(total), y: 0 }];
}

/** Moth perches to the right of the largest hole. */
export function mothPosition(h: HolePlacement): { x: number; y: number; size: number } {
  return { x: h.cx + h.r + 13, y: Math.max(13, h.cy - 4), size: 22 };
}

export function textAlternative(name: string, length: string, holeCount: number): string {
  return `${name}, ${length}, ${holeCount} moth ${holeCount === 1 ? 'hole' : 'holes'}`;
}
