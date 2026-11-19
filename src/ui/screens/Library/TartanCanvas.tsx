import { useEffect, useRef } from 'react';
import type { Tartan } from '../../../domain/types';
import { tileCanvas } from '../../../weave/twill';
import styles from './LibraryScreen.module.css';

/** Decorative twill swatch; the name beside it carries the meaning, so it is hidden from assistive tech. */
export function TartanCanvas({ tartan, height, thread }: { tartan: Tartan; height: number; thread: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = canvas.clientWidth || 160;
    canvas.height = height;
    const fill = ctx.createPattern(tileCanvas(tartan, thread), 'repeat');
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [tartan, height, thread]);
  return <canvas ref={ref} className={styles.canvas} style={{ height }} aria-hidden="true" />;
}
