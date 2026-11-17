import { mothHoles, type MothCandidate } from '../../../domain/moths';
import type { ItemId, ItemKind, LearnableItem, Progress, Scarf } from '../../../domain/types';
import type { ScarfCanvasHole } from '../../components/ScarfCanvas';

/**
 * Cloth added by each kind of item. The spec leaves the weighting to W2-B, so this
 * lives here until the services own it; a sentence is the most cloth, a form the least.
 */
export const ELLS_PER_ITEM: Record<ItemKind, number> = { lexeme: 0.04, form: 0.03, sentence: 0.08 };

const RULER_HEIGHT = 380;
const RULER_SPAN = 370;
const LABEL_HALF = 5;

export interface ScarfView {
  ells: number;
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
  for (const id of scarf.wovenOrder) {
    const item = items.get(id);
    if (!item) continue;
    counts.total += 1;
    ells += ELLS_PER_ITEM[item.kind];
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
    counts,
    holes: holes.map((h) => ({ ...h, gd: gdOf(items.get(h.itemId)) })),
    extraMoths,
  };
}

function gdOf(item: LearnableItem | undefined): string {
  return item?.gd ?? '';
}

export interface RulerLabel {
  text: string;
  /** Pixels from the top of the 380px ruler, already centred on the tick. */
  top: number;
}

const round = (v: number) => String(Math.round(v * 100) / 100);

/** Labels at 0, every half ell up to the total, then the exact total. */
export function rulerLabels(total: number): RulerLabel[] {
  const at = (v: number): RulerLabel => ({
    text: round(v),
    top: total > 0 ? RULER_HEIGHT - (v / total) * RULER_SPAN - LABEL_HALF : RULER_HEIGHT - 5,
  });
  const labels: RulerLabel[] = [at(0)];
  for (let v = 0.5; v <= total + 1e-9; v += 0.5) labels.push(at(v));
  const last = labels[labels.length - 1];
  if (total > 0 && last && Math.abs(Number(last.text) - total) > 0.005) labels.push(at(total));
  return labels;
}
