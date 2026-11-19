import type { ItemId, Progress, ReviewEvent, Scarf } from '../domain/types';
import { db, type TartanDB } from './db';

export function getProgress(itemId: ItemId, database: TartanDB = db): Promise<Progress | undefined> {
  return database.progress.get(itemId);
}

export async function putProgress(row: Progress, database: TartanDB = db): Promise<void> {
  await database.progress.put(row);
}

/** Items whose next review is at or before `now`, most overdue first. */
export function listDueProgress(now: number, database: TartanDB = db): Promise<Progress[]> {
  return database.progress.where('fsrs.due').belowOrEqual(now).sortBy('fsrs.due');
}

export async function appendReview(event: ReviewEvent, database: TartanDB = db): Promise<void> {
  await database.reviewLog.add(event);
}

/** Oldest first; pass an item id to see just that item's history. */
export function listReviews(itemId?: ItemId, database: TartanDB = db): Promise<ReviewEvent[]> {
  const rows = itemId === undefined ? database.reviewLog.orderBy('at') : database.reviewLog.where('itemId').equals(itemId);
  return itemId === undefined ? rows.toArray() : rows.sortBy('at');
}

export function getScarf(id: string, database: TartanDB = db): Promise<Scarf | undefined> {
  return database.scarves.get(id);
}

export async function putScarf(scarf: Scarf, database: TartanDB = db): Promise<void> {
  await database.scarves.put(scarf);
}

export async function deleteScarf(id: string, database: TartanDB = db): Promise<void> {
  await database.scarves.delete(id);
}

/** Newest first, matching how the shelf shows them. */
export function listScarves(database: TartanDB = db): Promise<Scarf[]> {
  return database.scarves.orderBy('createdAt').reverse().toArray();
}
