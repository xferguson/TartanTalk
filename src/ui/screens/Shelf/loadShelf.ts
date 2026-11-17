import type { ContentBundle } from '../../../content';
import type { TartanDB } from '../../../db/db';
import { listScarves } from '../../../db/repo';
import type { Tartan } from '../../../domain/types';
import { buildEntry, sortByLastWorked, type ShelfEntry } from './shelfModel';

/** Shown until a scarf's tartan exists in the content bundle (setts are still being sourced). */
export const FALLBACK_TARTAN: Tartan = {
  id: 'fallback',
  name: 'Plain weave',
  clan: '',
  sett: 'A/12 B4 A/12',
  colours: { A: '#6b6f8a', B: '#c9a24b' },
  scale: 1,
  provenance: { ref: 'built-in placeholder' },
  verified: false,
};

export interface ShelfCard extends ShelfEntry {
  tartan: Tartan;
  /** Gaelic text per woven item, for the hole buttons' spoken labels. */
  gd: Map<string, string>;
}

export async function loadShelf(
  database: TartanDB,
  bundle: ContentBundle,
  gdOf: ReadonlyMap<string, { gd: string }>,
  now: number,
): Promise<ShelfCard[]> {
  const scarves = await listScarves(database);
  const tartans = new Map(bundle.tartans.map((t) => [t.id, t]));
  const cards = await Promise.all(
    scarves.map(async (scarf) => {
      const owned = await database.progress.where('ownerScarfId').equals(scarf.id).toArray();
      const entry = buildEntry(scarf, owned, now);
      const gd = new Map(scarf.wovenOrder.map((id) => [id, gdOf.get(id)?.gd ?? id]));
      return { ...entry, tartan: tartans.get(scarf.tartanId) ?? FALLBACK_TARTAN, gd };
    }),
  );
  return sortByLastWorked(cards);
}
