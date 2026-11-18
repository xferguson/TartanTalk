import type { ItemId, LearnableItem } from '../../domain/types';

/**
 * Ells each woven item adds (placeholders; the Scarf screen's `ELLS_PER_ITEM` uses the same numbers until it imports this table). Constants live here, in one
 * place, because the PRD says they need tuning against real use.
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
