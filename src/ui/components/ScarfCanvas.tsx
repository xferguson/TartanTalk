import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { ItemId, MothHole, Tartan } from '../../domain/types';
import {
  bandPx,
  clampOffset,
  clothEnds,
  geometry,
  maxOffset,
  offsetToCentre,
  placeHoles,
  rulerMarks,
  splitHoles,
  textAlternative,
  type Geometry,
  type HolePlacement,
  type ScarfVariant,
} from '../../weave/layout';
import { paintScarf } from '../../weave/paint';
import { threadColours } from '../../weave/sett';
import { tileCanvas } from '../../weave/twill';
import { MothSprite } from './MothSprite';
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
  /** Ells each item adds, in `wovenOrder` order. When given, the detail scarf draws its ruler (B13). */
  itemElls?: readonly number[];
  /** Identifies the scarf so the "this can move" peek plays once per scarf per app session. */
  scarfId?: string;
}

const SHUTTLE_MS = 300;
const SLIDE_MS = 200;
const MARKER_MS = 250;
const PEEK_MS = 300;
const PEEK_PX = 24;
const KEY_STEP = 27; // three bands
const PAGE_STEP = 300;
const DRAG_THRESHOLD = 6;
const FADE_PX = 28;
const LINE_PX = 16; // wheel deltas given in lines
const FALLBACK_STRIP_WIDTH = 280;
const RULER_LEFT = 74; // 64px scarf + 10px gap
const RULER_LABEL_HALF = 5;

/** Scarves that have already shown the peek (or been moved by hand) in this app session. */
const peeked = new Set<string>();

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** A CSS mask that fades the cloth out over the ends of the window with more cloth beyond them. */
function fadeMask(g: Geometry, fadeStart: boolean, fadeEnd: boolean): string | undefined {
  if (!fadeStart && !fadeEnd) return undefined;
  const c = g.cloth;
  const lo = g.variant === 'strip' ? c.x : c.y;
  const hi = lo + (g.variant === 'strip' ? c.w : c.h);
  const dir = g.variant === 'strip' ? 'to right' : 'to bottom';
  const start = fadeStart ? `transparent ${lo}px, #000 ${lo + FADE_PX}px` : '#000 0px';
  const end = fadeEnd ? `#000 ${hi - FADE_PX}px, transparent ${hi}px` : '#000 100%';
  return `linear-gradient(${dir}, ${start}, ${end})`;
}

const holeWord = (n: number) => `${n} moth ${n === 1 ? 'hole' : 'holes'}`;

export function ScarfCanvas({
  tartan,
  variant,
  wovenOrder,
  holes = [],
  name,
  lengthLabel,
  onReweave,
  itemElls,
  scarfId,
}: ScarfCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stripWidth, setStripWidth] = useState(FALLBACK_STRIP_WIDTH);
  const [themeTick, setThemeTick] = useState(0);
  const [rawOffset, setRawOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const prevCount = useRef(wovenOrder.length);
  const tween = useRef(0);
  const drag = useRef<{ id: number; startY: number; startOffset: number; active: boolean } | null>(null);
  const swallowClick = useRef(false);
  const focusItem = useRef<ItemId | null>(null);
  const peekKey = scarfId ?? name;

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

  const n = wovenOrder.length;
  // Only the detail scarf can be moved; the strip always shows its newest end.
  const movable = variant === 'detail' && maxOffset(n, geo) > 0;
  const offset = variant === 'detail' ? clampOffset(rawOffset, n, geo) : 0;
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const stopTween = () => cancelAnimationFrame(tween.current);
  useEffect(() => stopTween, []);

  /** Ease the window through a list of stops; under reduced motion jump straight to the last. */
  const moveTo = useCallback((stops: { to: number; ms: number; ease: (t: number) => number }[]) => {
    stopTween();
    const last = stops[stops.length - 1];
    if (!last) return;
    if (prefersReducedMotion()) {
      setRawOffset(last.to);
      return;
    }
    let from = offsetRef.current;
    let i = 0;
    let start: number | null = null;
    const frame = (t: number) => {
      const stop = stops[i];
      if (!stop) return;
      start ??= t;
      const p = Math.min(1, (t - start) / stop.ms);
      setRawOffset(from + (stop.to - from) * stop.ease(p));
      if (p >= 1) {
        from = stop.to;
        i += 1;
        start = null;
      }
      if (i < stops.length) tween.current = requestAnimationFrame(frame);
    };
    tween.current = requestAnimationFrame(frame);
  }, []);

  const markMoved = () => peeked.add(peekKey);

  // Weaving while the learner looks at older cloth must not move their view: the new band pushes
  // all the cloth one band further along, so the offset follows it. A layout effect, so the
  // corrected view is what reaches the screen.
  const seenCount = useRef(n);
  useLayoutEffect(() => {
    const grew = n - seenCount.current;
    seenCount.current = n;
    if (grew > 0 && variant === 'detail' && offsetRef.current > 0) {
      stopTween();
      setRawOffset(offsetRef.current + grew * bandPx(geo));
    }
  }, [n, variant, geo]);

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
      offset,
    };

    const grew = wovenOrder.length > prevCount.current;
    prevCount.current = wovenOrder.length;
    if (!grew || offset > 0 || prefersReducedMotion()) {
      paintScarf(ctx, base);
      return;
    }

    // The cloth slides one band along to open space at the newest end (only once it overflows),
    // then the shuttle sweeps a highlight across the band that was just woven.
    const slideFrom = Math.min(bandPx(geo), maxOffset(wovenOrder.length, geo));
    const slideMs = slideFrom > 0 ? SLIDE_MS : 0;
    let raf = 0;
    let start: number | null = null;
    const frame = (t: number) => {
      start ??= t;
      const elapsed = t - start;
      if (elapsed < slideMs) {
        paintScarf(ctx, { ...base, offset: slideFrom * (1 - easeOut(elapsed / slideMs)), sweep: undefined });
        raf = requestAnimationFrame(frame);
        return;
      }
      const progress = Math.min(1, (elapsed - slideMs) / SHUTTLE_MS);
      paintScarf(ctx, { ...base, sweep: { bandIndex: wovenOrder.length - 1, progress } });
      if (progress < 1) raf = requestAnimationFrame(frame);
      else paintScarf(ctx, base);
    };
    if (slideMs > 0) paintScarf(ctx, { ...base, offset: slideFrom });
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo, tartan, threads, wovenOrder, mothHoles, themeTick, offset]);

  // A one-time nudge shows a long scarf can be moved.
  useEffect(() => {
    if (!movable || peeked.has(peekKey) || prefersReducedMotion()) return;
    peeked.add(peekKey);
    const out = Math.min(PEEK_PX, maxOffset(n, geo));
    moveTo([
      { to: out, ms: PEEK_MS, ease: easeInOut },
      { to: 0, ms: PEEK_MS, ease: easeInOut },
    ]);
  }, [movable, peekKey, n, geo, moveTo]);

  // The wheel needs a non-passive listener so it can keep the page still while the scarf moves.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !movable) return;
    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaMode === 1 ? e.deltaY * LINE_PX : e.deltaY;
      const next = clampOffset(offsetRef.current + delta, n, geo);
      if (next === offsetRef.current) return; // at an end: let the page scroll
      e.preventDefault();
      stopTween();
      markMoved();
      setRawOffset(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const placed = useMemo(() => placeHoles(mothHoles, wovenOrder, geo, offset), [mothHoles, wovenOrder, geo, offset]);
  const split = useMemo(() => splitHoles(placed, geo), [placed, geo]);
  const gdOf = new Map(holes.map((h) => [h.itemId, h.gd]));
  const ends = clothEnds(n, geo, offset);
  const moreNewer = n > 0 && !ends.newest;
  const moreOlder = n > 0 && !ends.oldest;

  // After a marker tap, hand focus to the hole it brought into view.
  useEffect(() => {
    const id = focusItem.current;
    if (!id) return;
    const button = Array.from(wrapRef.current?.querySelectorAll<HTMLButtonElement>('[data-item]') ?? []).find(
      (b) => b.dataset.item === id,
    );
    if (!button) return;
    focusItem.current = null;
    button.focus();
  });

  const showHole = (p: HolePlacement) => {
    markMoved();
    focusItem.current = p.itemId;
    moveTo([{ to: offsetToCentre(p, n, geo, offset), ms: MARKER_MS, ease: easeOut }]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!movable) return;
    const steps: Record<string, number> = {
      ArrowDown: offset + KEY_STEP,
      ArrowUp: offset - KEY_STEP,
      PageDown: offset + PAGE_STEP,
      PageUp: offset - PAGE_STEP,
      Home: 0,
      End: maxOffset(n, geo),
    };
    const next = steps[e.key];
    if (next === undefined) return;
    e.preventDefault();
    stopTween();
    markMoved();
    setRawOffset(clampOffset(next, n, geo));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    swallowClick.current = false;
    if (!movable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    stopTween();
    drag.current = { id: e.pointerId, startY: e.clientY, startOffset: offset, active: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      // Capture only once it is really a drag, so a tap still reaches the hole button under it.
      d.active = true;
      setDragging(true);
      markMoved();
      wrapRef.current?.setPointerCapture?.(e.pointerId);
    }
    // The cloth follows the finger: dragging up brings older cloth into view.
    setRawOffset(clampOffset(d.startOffset - dy, n, geo));
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (d.active) {
      swallowClick.current = true;
      setDragging(false);
      wrapRef.current?.releasePointerCapture?.(e.pointerId);
    }
    drag.current = null;
  };
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const c = geo.cloth;
  const strip = variant === 'strip';
  // Window edges: `start` is the top (detail) or left (strip) end.
  const fadeStart = strip ? moreOlder : moreNewer;
  const fadeEnd = strip ? false : moreOlder;
  const mask = fadeMask(geo, fadeStart, fadeEnd);
  const canvasStyle: CSSProperties | undefined = mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined;
  const midX = c.x + c.w / 2;

  const edge = (side: 'newer' | 'older') => {
    const beyond = side === 'newer' ? split.newer : split.older;
    const more = side === 'newer' ? moreNewer : moreOlder;
    if (!more) return null;
    const atStart = strip ? side === 'older' : side === 'newer';
    const pos: CSSProperties = strip
      ? { left: c.x + 16, top: c.y + c.h / 2 }
      : { left: midX, top: atStart ? c.y + 16 : c.y + c.h - 16 };
    const nearest = beyond[0];
    if (!nearest) {
      const chevron: CSSProperties = strip
        ? { left: c.x + 6 + 5, top: c.y + c.h / 2 }
        : { left: midX, top: atStart ? c.y + 6 + 5 : c.y + c.h - 6 - 5 };
      const rotate = strip ? -90 : atStart ? 180 : 0;
      return (
        <svg key={side} data-edge={side} className={styles.chevron} style={chevron} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <polyline points="1,3 5,7 9,3" transform={`rotate(${rotate} 5 5)`} />
        </svg>
      );
    }
    const content = (
      <>
        <MothSprite size={18} />
        <span className={styles.badge}>{beyond.length}</span>
      </>
    );
    if (strip) {
      return (
        <span key={side} data-edge={side} className={styles.marker} style={pos} aria-hidden="true">
          {content}
        </span>
      );
    }
    const where = side === 'older' ? 'further along the scarf' : 'back towards the newest weaving';
    return (
      <button
        key={side}
        type="button"
        data-edge={side}
        className={`${styles.marker} ${styles.markerButton}`}
        style={pos}
        aria-label={`${holeWord(beyond.length)} ${where}. Show them.`}
        onClick={() => showHole(nearest)}
      >
        {content}
      </button>
    );
  };

  const marks = variant === 'detail' && itemElls ? rulerMarks(itemElls, bandPx(geo)) : null;

  const classes = [
    styles.wrap,
    variant === 'detail' ? styles.detail : '',
    marks ? styles.withRuler : '',
    movable ? styles.movable : '',
    dragging ? styles.grabbing : '',
  ].join(' ');

  return (
    <div
      ref={wrapRef}
      className={classes}
      tabIndex={movable ? 0 : undefined}
      role={movable ? 'group' : undefined}
      aria-roledescription={movable ? 'scarf' : undefined}
      aria-label={movable ? `${name} cloth. Drag, or use the arrow keys, to move along the scarf.` : undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={canvasStyle}
        role="img"
        aria-label={textAlternative(name, lengthLabel, holes.length)}
      />
      {marks && (
        // Clipped to the canvas rather than the cloth, so the end labels are never cut in half.
        <div className={styles.ruler} style={{ left: RULER_LEFT, top: 0, height: geo.height }} aria-hidden="true">
          {marks.map((m) => (
            <span key={m.text} className={styles.tick} style={{ top: c.y + m.y - offset - RULER_LABEL_HALF }}>
              {m.text}
            </span>
          ))}
        </div>
      )}
      {split.visible.map((p) => (
        <button
          key={p.itemId}
          type="button"
          data-item={p.itemId}
          className={styles.hole}
          style={{ left: p.cx - 22, top: p.cy - 22 }}
          onClick={() => onReweave?.(p.itemId)}
        >
          <span className={styles.srOnly}>
            Reweave <span lang="gd">{gdOf.get(p.itemId)}</span>
          </span>
        </button>
      ))}
      {edge('newer')}
      {edge('older')}
    </div>
  );
}
