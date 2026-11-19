import type { Exercise } from '../../../domain/exercises';
import type { ItemId, LearnableItem } from '../../../domain/types';
import type { SessionMode } from '../../../app/store/sessionStore';

/** "{scarf} · new item {i} of {n}" while learning, "{scarf} · review {i} of {n}" for a tangle basket. */
export function topLine(scarfName: string, mode: SessionMode | null, answered: number, total: number): string {
  const i = Math.min(answered + 1, Math.max(total, 1));
  const n = Math.max(total, 1);
  return mode === 'tangles' ? `${scarfName} · review ${i} of ${n}` : `${scarfName} · new item ${i} of ${n}`;
}

export function exerciseLabel(type: Exercise['type']): string {
  return type === 'recognise' ? 'Choose the meaning' : type === 'cloze' ? 'Fill the gap' : 'Type the Gaelic';
}

const GRAVE = /[àèìòù]/i;

/**
 * The letter an accent-only slip got wrong, e.g. "o" for "bò" typed as "bo".
 * Null when the strings differ in length (word order or spacing), where we
 * cannot say which letter without guessing.
 */
export function slippedLetter(answer: string, given: string): string | null {
  const a = answer.normalize('NFC');
  const g = given.normalize('NFC').trim();
  if (a.length !== g.length) return null;
  for (let i = 0; i < a.length; i++) {
    if (GRAVE.test(a[i]) && a[i].toLowerCase() !== g[i].toLowerCase()) return a[i].normalize('NFD').replace(/\p{M}/gu, '');
  }
  return null;
}

export function weavingCaption(scarfName: string, ells: number): string {
  const rounded = Math.round(ells * 100) / 100;
  return `Woven into ${scarfName}: +${rounded} ell`;
}

/** "Typing the full sentence also counts as a review for {words}." Null when nothing was credited. */
export function creditNote(credited: readonly ItemId[], items: ReadonlyMap<ItemId, LearnableItem>, own: ItemId | null): string | null {
  const words = [...new Set(credited.filter((id) => id !== own).map((id) => gdOf(items.get(id)) ?? id))];
  return words.length ? `Typing the full sentence also counts as a review for ${words.join(', ')}.` : null;
}

export const gdOf = (item: LearnableItem | undefined): string | undefined => item?.gd;
