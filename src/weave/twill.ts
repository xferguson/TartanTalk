import type { Tartan } from '../domain/types';
import { hash } from './hash';
import { hexToRgb, threadColours, type Rgb } from './sett';

/**
 * Pixels of one repeat of a 2/2 twill: warp shows where ((x + y) & 3) < 2.
 * Square tile of (threads * tpx) device-independent px, RGBA. Pure and deterministic.
 */
export function twillPixels(threads: Rgb[], tpx: number): { size: number; data: Uint8ClampedArray } {
  const size = threads.length * tpx;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let Y = 0; Y < size; Y++) {
    for (let X = 0; X < size; X++) {
      const x = Math.floor(X / tpx);
      const y = Math.floor(Y / tpx);
      const warp = ((x + y) & 3) < 2;
      const c = warp ? threads[x] : threads[y];
      let f = warp ? 1.05 : 0.93;
      const ix = X % tpx;
      const iy = Y % tpx;
      // Thread edges are darker so each thread reads as a separate strand.
      if (warp && (ix === 0 || ix === tpx - 1)) f *= 0.86;
      if (!warp && (iy === 0 || iy === tpx - 1)) f *= 0.86;
      f *= 1 + (hash(X, Y) - 0.5) * 0.09;
      const o = (Y * size + X) * 4;
      data[o] = c[0] * f + 6;
      data[o + 1] = c[1] * f + 6;
      data[o + 2] = c[2] * f + 6;
      data[o + 3] = 255;
    }
  }
  return { size, data };
}

const tileCache = new Map<string, HTMLCanvasElement>();

/** Cached tile canvas for a tartan at a thread size, for use with createPattern. */
export function tileCanvas(tartan: Tartan, tpx: number): HTMLCanvasElement {
  const key = `${tartan.id}|${tartan.sett}|${tartan.scale ?? 1}|${JSON.stringify(tartan.colours)}|${tpx}`;
  const cached = tileCache.get(key);
  if (cached) return cached;
  const threads = threadColours(tartan.sett, tartan.colours, tartan.scale).map(hexToRgb);
  const { size, data } = twillPixels(threads, tpx);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(new ImageData(data, size, size), 0, 0);
  tileCache.set(key, canvas);
  return canvas;
}
