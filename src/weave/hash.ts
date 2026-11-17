/**
 * Deterministic 2D hash in [0, 1]. Ported exactly from the prototype so noise
 * and hole outlines are identical on every device and every render.
 */
export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Stable small integer from an item id, so each hole keeps its shape and place. */
export function seedOf(id: string): number {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 100003;
  return s;
}
