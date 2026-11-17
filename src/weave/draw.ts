import { hash } from './hash';

/** Draw routines take only the 2D context, so they are testable with a recording fake. */
type Ctx = CanvasRenderingContext2D;

export const MOTH_BODY = '#5b4a3d';

export function drawHole(ctx: Ctx, cx: number, cy: number, r: number, fill: string, seed: number): void {
  ctx.beginPath();
  for (let a = 0; a <= 12; a++) {
    const angle = (a / 12) * Math.PI * 2;
    const q = r * (0.75 + hash(seed + a, 7) * 0.5);
    ctx.lineTo(cx + Math.cos(angle) * q, cy + Math.sin(angle) * q);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawMoth(ctx: Ctx, x: number, y: number, s: number, wing: string, rotate = 0, body = MOTH_BODY): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.strokeStyle = body;
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const sd of [-1, 1]) {
    ctx.moveTo(sd * s * 0.08, -s * 0.28);
    ctx.quadraticCurveTo(sd * s * 0.2, -s * 0.55, sd * s * 0.32, -s * 0.52);
  }
  ctx.stroke();
  ctx.fillStyle = wing;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * s * 0.3, -s * 0.02, s * 0.32, s * 0.24, sd * -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sd * s * 0.24, s * 0.2, s * 0.2, s * 0.15, sd * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.12, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sd * s * 0.06, -s * 0.2, s * 0.055, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.arc(sd * s * 0.06, -s * 0.19, s * 0.028, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Fringe along both ends of the cloth: 1.6px round-capped lines, 8px long, every 3px,
 * alternating by 1px. Colours walk the sett so the fringe matches the cloth.
 * `horizontal` means the scarf runs left to right (the strip), so the fringe is at the left and right ends.
 */
export function drawFringe(
  ctx: Ctx,
  threads: string[],
  cloth: { x: number; y: number; w: number; h: number },
  horizontal: boolean,
): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6;
  const colour = (i: number) => threads[(i * 2) % threads.length];
  if (horizontal) {
    const x0 = cloth.x;
    const x1 = cloth.x + cloth.w;
    for (let i = cloth.y; i < cloth.y + cloth.h; i += 3) {
      ctx.strokeStyle = colour(i);
      ctx.beginPath();
      ctx.moveTo(x0, i + 1);
      ctx.lineTo(x0 - 8 + (i % 2), i + 2);
      ctx.moveTo(x1, i + 1);
      ctx.lineTo(x1 + 8 - (i % 2), i + 2);
      ctx.stroke();
    }
  } else {
    const y0 = cloth.y;
    const y1 = cloth.y + cloth.h;
    for (let i = cloth.x; i < cloth.x + cloth.w; i += 3) {
      ctx.strokeStyle = colour(i);
      ctx.beginPath();
      ctx.moveTo(i + 1, y0);
      ctx.lineTo(i + 2, y0 - 8 + (i % 2));
      ctx.moveTo(i + 1, y1);
      ctx.lineTo(i + 2, y1 + 8 - (i % 2));
      ctx.stroke();
    }
  }
}
