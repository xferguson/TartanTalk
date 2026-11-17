import type { ItemId, MothHole } from '../domain/types';
import { drawFringe, drawHole, drawMoth } from './draw';
import { layoutBands, mothPosition, placeHoles, type Geometry } from './layout';

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
  /** Shuttle sweep over one band: progress runs 0..1 left to right. */
  sweep?: { bandIndex: number; progress: number };
}

/** Paint the whole scarf in device-independent px (the caller applies the DPR scale). */
export function paintScarf(ctx: CanvasRenderingContext2D, o: PaintOptions): void {
  const g = o.geometry;
  const c = g.cloth;
  ctx.clearRect(0, 0, g.width, g.height);
  ctx.fillStyle = o.fill;
  ctx.fillRect(c.x, c.y, c.w, c.h);
  drawFringe(ctx, o.threads, c, g.variant === 'strip');

  if (g.variant === 'detail') {
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 1;
    for (const b of layoutBands(o.order, g)) {
      ctx.beginPath();
      ctx.moveTo(b.rect.x, b.rect.y);
      ctx.lineTo(b.rect.x + b.rect.w, b.rect.y);
      ctx.stroke();
    }
  }

  const holes = placeHoles(o.holes, o.order, g);
  holes.forEach((h) => drawHole(ctx, h.cx, h.cy, h.r, o.surface, h.seed));
  if (holes.length > 0) {
    const m = mothPosition(holes[0]);
    drawMoth(ctx, m.x, m.y, m.size, o.moth);
  }

  if (o.sweep) {
    const band = layoutBands(o.order, g)[o.sweep.bandIndex];
    if (band) {
      const r = band.rect;
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(r.x, r.y, r.w * o.sweep.progress, r.h);
    }
  }
}
