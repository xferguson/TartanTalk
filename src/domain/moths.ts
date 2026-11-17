import type { ItemId, MothHole, MothSize } from './types';

/** Overdue time, as a multiple of the item's last interval, at which a hole grows. */
export const MEDIUM_AT = 1;
export const LARGE_AT = 3;

/** Hole area in "blocks" of cloth, so the cap scales with the size of the scarf. */
export const HOLE_AREA: Record<MothSize, number> = { small: 0.5, medium: 1, large: 2 };

/** Visible damage never exceeds about this share of a scarf (see TECH_PLAN_2). */
export const DEFAULT_CAP_FRACTION = 0.15;

/** Avoids dividing by a zero interval; anything overdue by this much counts as a full interval. */
const MIN_INTERVAL_MS = 3_600_000;

const SIZE_RANK: Record<MothSize, number> = { small: 0, medium: 1, large: 2 };

/** One woven item's schedule, as the caller reads it from Progress. */
export interface MothCandidate {
  itemId: ItemId;
  /** Epoch ms when the item became due. */
  due: number;
  /** Length of the last interval, in ms. */
  lastIntervalMs: number;
}

export interface MothOptions {
  /** Number of woven items (blocks) in the scarf; sets the cap. */
  totalItems: number;
  capFraction?: number;
}

export interface MothResult {
  /** Visible holes, largest and most overdue first. */
  holes: MothHole[];
  /** Overdue items beyond the cap: shown as extra moths, not extra damage. */
  extraMoths: number;
}

export function holeSize(overdueMs: number, lastIntervalMs: number): MothSize {
  const ratio = overdueMs / Math.max(lastIntervalMs, MIN_INTERVAL_MS);
  if (ratio >= LARGE_AT) return 'large';
  if (ratio >= MEDIUM_AT) return 'medium';
  return 'small';
}

export function mothHoles(items: readonly MothCandidate[], now: number, opts: MothOptions): MothResult {
  const overdue = items
    .filter((i) => i.due <= now)
    .map((i) => {
      const overdueMs = now - i.due;
      return { itemId: i.itemId, overdueMs, size: holeSize(overdueMs, i.lastIntervalMs) };
    })
    .sort((a, b) => SIZE_RANK[b.size] - SIZE_RANK[a.size] || b.overdueMs - a.overdueMs);

  const cap = Math.max(0, opts.totalItems) * (opts.capFraction ?? DEFAULT_CAP_FRACTION);
  const holes: MothHole[] = [];
  let area = 0;
  for (const o of overdue) {
    // The first hole is always shown so a tiny scarf still reveals its moth.
    if (holes.length > 0 && area + HOLE_AREA[o.size] > cap) break;
    holes.push({ itemId: o.itemId, size: o.size });
    area += HOLE_AREA[o.size];
  }
  return { holes, extraMoths: overdue.length - holes.length };
}
