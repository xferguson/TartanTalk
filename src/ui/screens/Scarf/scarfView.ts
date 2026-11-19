import { ellsForItem } from '../../../app/services/length';
import { mothHoles, type MothCandidate } from '../../../domain/moths';
import type { ItemId, LearnableItem, Progress, Scarf } from '../../../domain/types';
import type { ScarfCanvasHole } from '../../components/ScarfCanvas';

export interface ScarfView {
  ells: number;
  /** Ells each woven item adds, in weaving order, for the ruler. */
  itemElls: number[];
  counts: { total: number; words: number; forms: number; sentences: number };
  holes: ScarfCanvasHole[];
  extraMoths: number;
}

interface Input {
  scarf: Scarf;
  items: ReadonlyMap<ItemId, LearnableItem>;
  progress: readonly Progress[];
  now: number;
}

export function buildScarfView({ scarf, items, progress, now }: Input): ScarfView {
  const counts = { total: 0, words: 0, forms: 0, sentences: 0 };
  let ells = 0;
  const itemElls: number[] = [];
  for (const id of scarf.wovenOrder) {
    const item = items.get(id);
    const e = ellsForItem(item);
    itemElls.push(e);
    if (!item) continue;
    counts.total += 1;
    ells += e;
    if (item.kind === 'lexeme') counts.words += 1;
    else if (item.kind === 'form') counts.forms += 1;
    else counts.sentences += 1;
  }

  const woven = new Set(scarf.wovenOrder);
  const candidates: MothCandidate[] = progress
    .filter((p) => woven.has(p.itemId) && p.fsrs !== null)
    .map((p) => ({ itemId: p.itemId, due: p.fsrs?.due ?? 0, lastIntervalMs: (p.fsrs?.due ?? 0) - (p.fsrs?.lastReview ?? 0) }));
  const { holes, extraMoths } = mothHoles(candidates, now, { totalItems: counts.total });

  return {
    ells,
    itemElls,
    counts,
    holes: holes.map((h) => ({ ...h, gd: gdOf(items.get(h.itemId)) })),
    extraMoths,
  };
}

function gdOf(item: LearnableItem | undefined): string {
  return item?.gd ?? '';
}
