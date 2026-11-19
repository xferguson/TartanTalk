import type { TartanDB } from '../../../db/db';
import { listScarves } from '../../../db/repo';
import type { ItemId } from '../../../domain/types';

export interface TangleRow {
  itemId: ItemId;
  gd: string;
  en: string;
  scarfName: string;
}

interface Describable {
  gd: string;
  en: string;
}

/** Every tangled item with its Gaelic, English and owning scarf, ordered by id for a steady list. */
export async function loadTangles(database: TartanDB, items: ReadonlyMap<ItemId, Describable>): Promise<TangleRow[]> {
  const [progress, scarves] = await Promise.all([database.progress.toArray(), listScarves(database)]);
  const names = new Map(scarves.map((s) => [s.id, s.name]));
  return progress
    .filter((p) => p.tangled)
    .flatMap((p) => {
      const item = items.get(p.itemId);
      if (!item) return [];
      return [{ itemId: p.itemId, gd: item.gd, en: item.en, scarfName: (p.ownerScarfId && names.get(p.ownerScarfId)) || '' }];
    })
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}
