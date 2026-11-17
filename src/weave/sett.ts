/**
 * Parse a thread-count sett such as "B/30 R4 G/34" into one colour code per thread.
 * A "/" marks a pivot. A sett pivoting at either end is symmetric: the middle
 * stripes are mirrored back, so the pivots are not repeated. Otherwise it repeats as written.
 * `scale` multiplies every stripe's thread count (minimum 1 thread).
 */
export function parseSett(sett: string, scale = 1): string[] {
  const stripes = sett
    .trim()
    .split(/\s+/)
    .map((token) => {
      const m = /^([A-Z]+)(\/?)(\d+)$/.exec(token);
      if (!m) throw new Error(`Invalid sett stripe "${token}" in "${sett}"`);
      return { colour: m[1], count: Math.max(1, Math.round(Number(m[3]) * scale)), pivot: m[2] === '/' };
    });
  const symmetric = stripes[0].pivot || stripes[stripes.length - 1].pivot;
  const sequence = symmetric ? stripes.concat(stripes.slice(1, -1).reverse()) : stripes;
  const threads: string[] = [];
  for (const s of sequence) for (let i = 0; i < s.count; i++) threads.push(s.colour);
  return threads;
}

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

const FALLBACK_HEX = '#8a8078';

/** Threads of a tartan as hex colours; unknown codes fall back to a neutral wool. */
export function threadColours(sett: string, colours: Record<string, string>, scale?: number): string[] {
  return parseSett(sett, scale).map((code) => colours[code] ?? FALLBACK_HEX);
}
