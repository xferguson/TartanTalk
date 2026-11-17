import { db, type TartanDB } from './db';

const FORMAT = 'tartan-talk-backup';
const VERSION = 2;

/** Everything the learner owns, as JSON they can keep: data is local-only, so this is the only backup. */
export async function exportBackup(database: TartanDB = db): Promise<string> {
  const [settings, progress, reviewLog, scarves] = await Promise.all([
    database.settings.toArray(),
    database.progress.toArray(),
    database.reviewLog.toArray(),
    database.scarves.toArray(),
  ]);
  return JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: Date.now(), settings, progress, reviewLog, scarves });
}

const TABLES = ['settings', 'progress', 'reviewLog', 'scarves'] as const;

/**
 * Replaces all local data with the backup. Validated before anything is written, and written in
 * one transaction, so a bad file never costs the learner their progress.
 */
export async function importBackup(json: string, database: TartanDB = db): Promise<void> {
  const data: unknown = JSON.parse(json);
  if (typeof data !== 'object' || data === null) throw new Error('Not a Tartan Talk backup');
  const backup = data as Record<string, unknown>;
  if (backup.format !== FORMAT) throw new Error('Not a Tartan Talk backup');
  if (typeof backup.version !== 'number' || backup.version > VERSION) {
    throw new Error('This backup is from a newer version of Tartan Talk');
  }
  for (const table of TABLES) {
    if (!Array.isArray(backup[table])) throw new Error(`Invalid backup: ${table} is missing`);
  }

  await database.transaction('rw', database.settings, database.progress, database.reviewLog, database.scarves, async () => {
    await Promise.all(TABLES.map((t) => database[t].clear()));
    // Casts are safe: shapes were written by exportBackup; the domain types are the contract.
    await database.settings.bulkAdd(backup.settings as never[]);
    await database.progress.bulkAdd(backup.progress as never[]);
    await database.reviewLog.bulkAdd(backup.reviewLog as never[]);
    await database.scarves.bulkAdd(backup.scarves as never[]);
  });
}
