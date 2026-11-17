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

/**
 * One band per woven item, in weaving order. The detail scarf hangs from the top in 9px bands
 * (squeezed if there are too many to fit); the strip spreads its bands evenly along its length.
 */
export function layoutBands(order: ItemId[], g: Geometry): Band[] {
  const n = order.length;
  if (n === 0) return [];
  if (g.variant === 'strip') {
    const bw = g.cloth.w / n;
    return order.map((itemId, index) => ({ index, itemId, rect: { x: g.cloth.x + index * bw, y: g.cloth.y, w: bw, h: g.cloth.h } }));
  }
  const bh = Math.min(DETAIL_BAND_HEIGHT, g.cloth.h / n);
  return order.map((itemId, index) => ({ index, itemId, rect: { x: g.cloth.x, y: g.cloth.y + index * bh, w: g.cloth.w, h: bh } }));
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
export function placeHoles(holes: MothHole[], order: ItemId[], g: Geometry): HolePlacement[] {
  const bands = new Map(layoutBands(order, g).map((b) => [b.itemId, b]));
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

/** Moth perches to the right of the largest hole. */
export function mothPosition(h: HolePlacement): { x: number; y: number; size: number } {
  return { x: h.cx + h.r + 13, y: Math.max(13, h.cy - 4), size: 22 };
}

export function textAlternative(name: string, length: string, holeCount: number): string {
  return `${name}, ${length}, ${holeCount} moth ${holeCount === 1 ? 'hole' : 'holes'}`;
}
