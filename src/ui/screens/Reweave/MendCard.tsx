import { useEffect, useRef, useState } from 'react';
import type { Tartan } from '../../../domain/types';
import { drawHole } from '../../../weave/draw';
import { seedOf } from '../../../weave/hash';
import { tileCanvas } from '../../../weave/twill';
import { MothSprite } from '../../components/MothSprite';
import styles from './MendCard.module.css';

const HEIGHT = 120;
const HOLE_R = 14;
const HOLE_Y = 64;
const CLOSE_MS = 400;

const reduced = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  tartan: Tartan;
  /** Identifies the item so the hole's shape stays steady across repaints. */
  itemId: string;
  /** True once the item is answered correctly: the hole closes and the moth leaves. */
  mended: boolean;
}

/** The close-up of the cloth being mended (spec B7). */
export function MendCard({ tartan, itemId, mended }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setWidth(el.clientWidth || 300);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 300));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr);
    c.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const surface = getComputedStyle(c).getPropertyValue('--surface').trim() || '#fbf5ea';
    const cx = width * 0.42;
    const seed = seedOf(itemId);

    const paint = (r: number) => {
      ctx.clearRect(0, 0, width, HEIGHT);
      ctx.fillStyle = ctx.createPattern(tileCanvas(tartan, 3), 'repeat') ?? '#888';
      ctx.fillRect(0, 0, width, HEIGHT);
      if (r > 0.5) drawHole(ctx, cx, HOLE_Y, r, surface, seed);
      if (!mended) {
        // The mending thread, arcing over the hole.
        ctx.strokeStyle = '#e3b23c';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - 22, HOLE_Y);
        ctx.quadraticCurveTo(cx, 40, cx + 26, 66);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Trail left by the departing moth.
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + HOLE_R + 13, HOLE_Y - 4);
        ctx.lineTo(width * 0.78, 34);
        ctx.stroke();
      }
    };

    if (!mended || reduced()) {
      paint(mended ? 0 : HOLE_R);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const frame = (t: number) => {
      start ??= t;
      const p = Math.min(1, (t - start) / CLOSE_MS);
      paint(HOLE_R * (1 - p));
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tartan, itemId, mended, width]);

  const start = { left: width * 0.42 + HOLE_R + 13 - 17, top: HOLE_Y - 4 - 17 };
  const end = { left: width * 0.78 - 17, top: 34 - 17 };
  const pos = mended ? end : start;
  return (
    <div ref={wrap} className={styles.wrap} data-mended={mended}>
      <canvas ref={canvas} className={styles.canvas} role="img" aria-label={mended ? 'The hole is mended' : 'A moth hole to mend'} />
      <div className={`${styles.moth} ${mended ? styles.away : ''}`} style={{ left: pos.left, top: pos.top }}>
        <MothSprite size={34} rotate={mended ? 0.35 : 0} />
      </div>
    </div>
  );
}
