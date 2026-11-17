import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ItemId, MothHole, Tartan } from '../../domain/types';
import { geometry, placeHoles, textAlternative, type ScarfVariant } from '../../weave/layout';
import { paintScarf } from '../../weave/paint';
import { threadColours } from '../../weave/sett';
import { tileCanvas } from '../../weave/twill';
import styles from './ScarfCanvas.module.css';

export interface ScarfCanvasHole extends MothHole {
  /** Gaelic text of the item, spoken as "Reweave {gd}". */
  gd: string;
}

export interface ScarfCanvasProps {
  tartan: Tartan;
  variant: ScarfVariant;
  wovenOrder: ItemId[];
  holes?: ScarfCanvasHole[];
  name: string;
  /** Formatted length, e.g. "2.4 ells" (see `formatLength`). */
  lengthLabel: string;
  onReweave?: (itemId: ItemId) => void;
}

const SHUTTLE_MS = 300;
const FALLBACK_STRIP_WIDTH = 280;

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ScarfCanvas({ tartan, variant, wovenOrder, holes = [], name, lengthLabel, onReweave }: ScarfCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stripWidth, setStripWidth] = useState(FALLBACK_STRIP_WIDTH);
  const [themeTick, setThemeTick] = useState(0);
  const prevCount = useRef(wovenOrder.length);

  // The strip fills its card; follow its width.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (variant !== 'strip' || !el) return;
    setStripWidth(el.clientWidth || FALLBACK_STRIP_WIDTH);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setStripWidth(el.clientWidth || FALLBACK_STRIP_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, [variant]);

  // Holes and the moth take their colours from the theme tokens, so repaint when the theme changes.
  useEffect(() => {
    const bump = () => setThemeTick((t) => t + 1);
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    mq?.addEventListener?.('change', bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mq?.removeEventListener?.('change', bump);
      mo.disconnect();
    };
  }, []);

  const geo = useMemo(() => geometry(variant, stripWidth), [variant, stripWidth]);
  const threads = useMemo(() => threadColours(tartan.sett, tartan.colours, tartan.scale), [tartan]);
  const mothHoles = useMemo<MothHole[]>(() => holes.map(({ itemId, size }) => ({ itemId, size })), [holes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(geo.width * dpr);
    canvas.height = Math.round(geo.height * dpr);
    canvas.style.width = `${geo.width}px`;
    canvas.style.height = `${geo.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cs = getComputedStyle(canvas);
    const fill = ctx.createPattern(tileCanvas(tartan, geo.threadPx), 'repeat') ?? threads[0];
    const base = {
      geometry: geo,
      fill,
      threads,
      order: wovenOrder,
      holes: mothHoles,
      surface: cs.getPropertyValue('--surface').trim() || '#fbf5ea',
      moth: cs.getPropertyValue('--moth').trim() || '#cdb79c',
    };

    const grew = wovenOrder.length > prevCount.current;
    prevCount.current = wovenOrder.length;
    if (!grew || prefersReducedMotion()) {
      paintScarf(ctx, base);
      return;
    }

    // Shuttle: sweep a highlight left to right across the band that was just woven.
    let raf = 0;
    let start: number | null = null;
    const frame = (t: number) => {
      start ??= t;
      const progress = Math.min(1, (t - start) / SHUTTLE_MS);
      paintScarf(ctx, { ...base, sweep: { bandIndex: wovenOrder.length - 1, progress } });
      if (progress < 1) raf = requestAnimationFrame(frame);
      else paintScarf(ctx, base);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo, tartan, threads, wovenOrder, mothHoles, themeTick]);

  const placed = useMemo(() => placeHoles(mothHoles, wovenOrder, geo), [mothHoles, wovenOrder, geo]);
  const gdOf = new Map(holes.map((h) => [h.itemId, h.gd]));

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${variant === 'detail' ? styles.detail : ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={textAlternative(name, lengthLabel, holes.length)}
      />
      {placed.map((p) => (
        <button
          key={p.itemId}
          type="button"
          className={styles.hole}
          style={{ left: p.cx - 22, top: p.cy - 22 }}
          onClick={() => onReweave?.(p.itemId)}
        >
          <span className={styles.srOnly}>
            Reweave <span lang="gd">{gdOf.get(p.itemId)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
