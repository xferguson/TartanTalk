import type { ItemId, LearnableItem } from '../../domain/types';

/**
 * Ells each woven item adds. The single source for every screen (shelf, scarf, loom), so a scarf
 * shows the same length everywhere. Placeholders: the PRD says they need tuning against real use.
 */
export const ELLS_PER_KIND: Record<LearnableItem['kind'], number> = {
  lexeme: 0.04,
  form: 0.03,
  sentence: 0.08,
};

export function ellsForItem(item: LearnableItem | undefined): number {
  return item ? ELLS_PER_KIND[item.kind] : 0;
}

export function scarfLengthElls(wovenOrder: readonly ItemId[], items: ReadonlyMap<ItemId, LearnableItem>): number {
  return wovenOrder.reduce((sum, id) => sum + ellsForItem(items.get(id)), 0);
}
