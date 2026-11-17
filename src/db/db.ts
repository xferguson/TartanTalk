import Dexie, { type EntityTable } from 'dexie';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class TartanDB extends Dexie {
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(name = 'tartan-talk') {
    super(name);
    // v1: settings only. Progress, review log and scarves arrive with the learning loop.
    this.version(1).stores({ settings: '&key' });
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
