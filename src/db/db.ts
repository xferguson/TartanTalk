import Dexie, { type EntityTable } from 'dexie';
import type { Progress, ReviewEvent, Scarf } from '../domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class TartanDB extends Dexie {
  settings!: EntityTable<SettingRow, 'key'>;
  progress!: EntityTable<Progress, 'itemId'>;
  reviewLog!: EntityTable<ReviewEvent, 'id'>;
  scarves!: EntityTable<Scarf, 'id'>;

  constructor(name = 'tartan-talk') {
    super(name);
    this.version(1).stores({ settings: '&key' });
    // v2 only adds tables, so v1 data upgrades with no migration code. 'fsrs.due' is indexed
    // to find due reviews; rows without a schedule (fsrs: null) are simply left out of it.
    this.version(2).stores({
      settings: '&key',
      progress: '&itemId, phase, ownerScarfId, tangled, fsrs.due',
      reviewLog: '++id, itemId, at',
      scarves: '&id, createdAt',
    });
  }
}

export const db = new TartanDB();

export async function getSetting<T>(key: string, fallback: T, database: TartanDB = db): Promise<T> {
  const row = await database.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown, database: TartanDB = db): Promise<void> {
  await database.settings.put({ key, value });
}
