/**
 * Sentence unlocking and scarf filters (W1-F).
 * A sentence can be learned only once every tracked word and form in it has been learned.
 */
import type { ItemId, LearnableItem, Progress, Sentence } from './types';

/** Item ids a sentence depends on (punctuation and untracked tokens are skipped). */
export function trackedTokens(sentence: Sentence): ItemId[] {
  return sentence.tokens.flatMap((t) => (t.itemId ? [t.itemId] : []));
}

export function isUnlocked(sentence: Sentence, learned: ReadonlySet<ItemId>): boolean {
  return trackedTokens(sentence).every((id) => learned.has(id));
}

/** Sentences that are unlocked with `after` but were not with `before`. */
export function newlyUnlocked(sentences: readonly Sentence[], before: ReadonlySet<ItemId>, after: ReadonlySet<ItemId>): Sentence[] {
  return sentences.filter((s) => isUnlocked(s, after) && !isUnlocked(s, before));
}

/** A scarf's filter matches an item that shares any tag with it. */
export function matchesFilter(item: LearnableItem, tagFilter: readonly string[]): boolean {
  return item.tags.some((tag) => tagFilter.includes(tag));
}

/** Learned means woven: an item keeps that status even while tangled and being relearned. */
export function isLearned(progress: Progress | undefined): boolean {
  return progress?.wovenAt != null;
}

/** Items a scarf can still teach: matching its filter and not yet learned in any scarf. */
export function candidateItems(
  items: readonly LearnableItem[],
  tagFilter: readonly string[],
  progress: ReadonlyMap<ItemId, Progress>,
): LearnableItem[] {
  return items.filter((item) => matchesFilter(item, tagFilter) && !isLearned(progress.get(item.id)));
}

export interface ScarfPreview {
  newItems: number;
  wovenElsewhere: number;
}

/** "N new items, M already woven elsewhere" for the new-scarf screen. */
export function scarfPreview(
  items: readonly LearnableItem[],
  tagFilter: readonly string[],
  progress: ReadonlyMap<ItemId, Progress>,
): ScarfPreview {
  let newItems = 0;
  let wovenElsewhere = 0;
  for (const item of items) {
    if (!matchesFilter(item, tagFilter)) continue;
    if (isLearned(progress.get(item.id))) wovenElsewhere++;
    else newItems++;
  }
  return { newItems, wovenElsewhere };
}
