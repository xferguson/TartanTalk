import { getScarf, listScarves, putScarf } from '../../db/repo';
import type { Progress, Scarf, ItemId } from '../../domain/types';
import type { ServiceDeps } from './types';

export interface NewScarfInput {
  name: string;
  tagFilter: string[];
  tartanId: string;
}

/** Start a scarf. Nothing is woven yet; the first batch is chosen when the loom opens. */
export async function startScarf(deps: ServiceDeps, input: NewScarfInput): Promise<Scarf> {
  const now = deps.clock.now();
  const scarf: Scarf = {
    id: `scarf-${now.toString(36)}-${Math.floor(deps.rng() * 36 ** 4).toString(36)}`,
    name: input.name.trim() || 'Untitled scarf',
    tagFilter: [...input.tagFilter],
    tartanId: input.tartanId,
    createdAt: now,
    pausedAt: null,
    wovenOrder: [],
  };
  await putScarf(scarf, deps.db);
  return scarf;
}

export const shelf = (deps: ServiceDeps): Promise<Scarf[]> => listScarves(deps.db);

export const findScarf = (deps: ServiceDeps, id: string): Promise<Scarf | undefined> => getScarf(id, deps.db);

export async function loadProgress(deps: ServiceDeps): Promise<Map<ItemId, Progress>> {
  const rows = await deps.db.progress.toArray();
  return new Map(rows.map((r) => [r.itemId, r]));
}
