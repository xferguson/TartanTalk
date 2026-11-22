import { useEffect, useRef } from 'react';
import type { Tartan } from '../../../domain/types';
import { tileCanvas } from '../../../weave/twill';
import styles from './NewScarfScreen.module.css';

const HEIGHT = 54;
const THREAD_PX = 2;

/** A selectable swatch; the canvas is decorative, the name is the accessible label. */
export function TartanSwatch({ tartan, selected, onSelect }: { tartan: Tartan; selected: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = canvas.clientWidth || 96;
    canvas.height = HEIGHT;
    const fill = ctx.createPattern(tileCanvas(tartan, THREAD_PX), 'repeat');
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [tartan]);
  return (
    <button
      type="button"
      className={`${styles.swatch} ${selected ? styles.swatchOn : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <canvas ref={ref} className={styles.swatchCanvas} aria-hidden="true" />
      <span className={styles.swatchLabel}>{tartan.variant ? `${tartan.name} (${tartan.variant})` : tartan.name}</span>
    </button>
  );
}
