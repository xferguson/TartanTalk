import type { ItemId, MothHole } from '../domain/types';
import { drawFringe, drawHole, drawMoth } from './draw';
import {
  clampOffset,
  clothEnds,
  clothLength,
  layoutBands,
  mothPosition,
  placeHoles,
  splitHoles,
  viewSpan,
  visibleBands,
  wovenRect,
  type Geometry,
} from './layout';

export interface PaintOptions {
  geometry: Geometry;
  /** Twill fill (a CanvasPattern in the browser). */
  fill: string | CanvasPattern;
  /** Hex colour per thread of the sett, used for the fringe. */
  threads: string[];
  order: ItemId[];
  holes: MothHole[];
  /** Card colour showing through holes. */
  surface: string;
  moth: string;
  /** How far the window has moved from the newest end, in px (B13). */
  offset?: number;
  /** Shuttle sweep over one band: progress runs 0..1 left to right. */
  sweep?: { bandIndex: number; progress: number };
}

/**
 * Pin the twill to the oldest end of the cloth, so woven cloth keeps its look as the scarf grows
 * and as the window moves over it, instead of the weave swimming under a fixed pattern.
 */
function anchorFill(fill: string | CanvasPattern, x: number, y: number): void {
  if (typeof fill === 'string' || typeof fill.setTransform !== 'function' || typeof DOMMatrix === 'undefined') return;
  fill.setTransform(new DOMMatrix().translate(x, y));
}

/** Paint the scarf as seen through its window, in device-independent px (the caller applies the DPR scale). */
export function paintScarf(ctx: CanvasRenderingContext2D, o: PaintOptions): void {
  const g = o.geometry;
  const c = g.cloth;
  const n = o.order.length;
  const offset = clampOffset(o.offset ?? 0, n, g);
  ctx.clearRect(0, 0, g.width, g.height);

  if (clothLength(n, g) < viewSpan(g)) {
    // The unwoven part of the loom is a dashed outline, so the learner can see how far there is to go.
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(128,128,128,.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
    ctx.restore();
  }

  const placed = splitHoles(placeHoles(o.holes, o.order, g, offset), g).visible;

  if (n > 0) {
    const woven = wovenRect(n, g, offset);
    const bands = layoutBands(o.order, g, offset);
    const oldest = bands[0]?.rect;
    if (oldest) anchorFill(o.fill, g.variant === 'strip' ? oldest.x : 0, g.variant === 'strip' ? 0 : oldest.y + oldest.h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, c.y, c.w, c.h);
    ctx.clip();
    ctx.fillStyle = o.fill;
    ctx.fillRect(woven.x, woven.y, woven.w, woven.h);

    if (g.variant === 'detail') {
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      for (const b of visibleBands(o.order, g, offset)) {
        ctx.beginPath();
        ctx.moveTo(b.rect.x, b.rect.y);
        ctx.lineTo(b.rect.x + b.rect.w, b.rect.y);
        ctx.stroke();
      }
    }

    placed.forEach((h) => drawHole(ctx, h.cx, h.cy, h.r, o.surface, h.seed));

    if (o.sweep) {
      const band = bands[o.sweep.bandIndex];
      if (band) {
        const r = band.rect;
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(r.x, r.y, r.w * o.sweep.progress, r.h);
      }
    }
    ctx.restore();

    // The fringe only belongs on an end of the cloth that is in view.
    const ends = clothEnds(n, g, offset);
    drawFringe(
      ctx,
      o.threads,
      woven,
      g.variant === 'strip',
      g.variant === 'strip' ? { start: ends.oldest, end: ends.newest } : { start: ends.newest, end: ends.oldest },
    );
  }

  const first = placed[0];
  if (first) {
    const m = mothPosition(first);
    drawMoth(ctx, m.x, m.y, m.size, o.moth);
  }
}
