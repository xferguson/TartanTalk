import { mothHoles } from '../../../domain/moths';
import type { ItemId, MothHole, Progress, Scarf } from '../../../domain/types';

/**
 * Ells each woven item adds (PRD: word < form < sentence). Kept here until W2-B owns the
 * shared length service; the shelf only needs the totals.
 */
export const ELLS_PER_ITEM = { lex: 0.02, form: 0.03, sent: 0.06 } as const;

export function ellsFor(itemId: ItemId): number {
  const kind = itemId.split(':', 1)[0] as keyof typeof ELLS_PER_ITEM;
  return ELLS_PER_ITEM[kind] ?? ELLS_PER_ITEM.lex;
}

export interface ShelfEntry {
  scarf: Scarf;
  ells: number;
  holes: MothHole[];
  lastWorked: number;
}

/** Everything the shelf shows for one scarf, from its own progress rows. */
export function buildEntry(scarf: Scarf, owned: readonly Progress[], now: number): ShelfEntry {
  const woven = new Set(scarf.wovenOrder);
  const rows = owned.filter((p) => woven.has(p.itemId));
  const candidates = rows.flatMap((p) =>
    p.fsrs ? [{ itemId: p.itemId, due: p.fsrs.due, lastIntervalMs: p.fsrs.due - p.fsrs.lastReview }] : [],
  );
  const { holes } = mothHoles(candidates, now, { totalItems: scarf.wovenOrder.length });
  const lastWorked = rows.reduce((m, p) => Math.max(m, p.wovenAt ?? 0), scarf.createdAt);
  return { scarf, ells: scarf.wovenOrder.reduce((s, id) => s + ellsFor(id), 0), holes, lastWorked };
}

export function sortByLastWorked<T extends ShelfEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => b.lastWorked - a.lastWorked);
}

export interface ShelfSummary {
  greeting: { gd: string; en: string };
  scarvesWithHoles: number;
  totalElls: number;
  /** The scarf with the most holes, or null when none have any. */
  reweaveTarget: ShelfEntry | null;
}

export function summarise(entries: readonly ShelfEntry[], hour: number): ShelfSummary {
  const morning = hour < 12;
  const withHoles = entries.filter((e) => e.holes.length > 0);
  const target = withHoles.reduce<ShelfEntry | null>((best, e) => (!best || e.holes.length > best.holes.length ? e : best), null);
  return {
    greeting: morning ? { gd: 'Madainn mhath!', en: 'Good morning.' } : { gd: 'Feasgar math!', en: 'Good afternoon.' },
    scarvesWithHoles: withHoles.length,
    totalElls: entries.reduce((s, e) => s + e.ells, 0),
    reweaveTarget: target,
  };
}

export function visitorsText(n: number): string {
  if (n === 0) return '';
  return n === 1 ? '1 scarf has visitors.' : `${n} scarves have visitors.`;
}

export function holeChipText(n: number): string {
  return n === 1 ? '1 moth hole' : `${n} moth holes`;
}
