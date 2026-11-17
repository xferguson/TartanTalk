import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { TartanDB, getSetting, setSetting } from '../../../src/db/db';
import {
  appendReview,
  deleteScarf,
  getProgress,
  getScarf,
  listDueProgress,
  listReviews,
  listScarves,
  putProgress,
  putScarf,
} from '../../../src/db/repo';
import { exportBackup, importBackup } from '../../../src/db/backup';
import type { Progress, ReviewEvent, Scarf } from '../../../src/domain/types';

let database: TartanDB | undefined;
let n = 0;
const fresh = () => (database = new TartanDB(`w1k-${n++}`));

afterEach(async () => {
  await database?.delete();
  database = undefined;
});

const progress = (itemId: string, due: number | null, extra: Partial<Progress> = {}): Progress => ({
  itemId,
  phase: due === null ? 'learning' : 'review',
  correctInSession: 0,
  ladderStep: 0,
  seededStep: 0,
  fsrs: due === null ? null : { stability: 1, difficulty: 5, lastReview: 0, due, reps: 1, lapses: 0 },
  ownerScarfId: null,
  wovenAt: null,
  consecutiveMisses: 0,
  tangled: false,
  ...extra,
});

const scarf = (id: string, createdAt: number, extra: Partial<Scarf> = {}): Scarf => ({
  id,
  name: id,
  tagFilter: ['love'],
  tartanId: 'ferguson',
  createdAt,
  pausedAt: null,
  wovenOrder: [],
  ...extra,
});

const review = (itemId: string, at: number): ReviewEvent => ({
  itemId,
  at,
  exercise: 'recognise',
  rating: 'good',
  implicit: false,
  weight: 1,
});

describe('migration from v1', () => {
  it('keeps settings and adds the new tables', async () => {
    const v1 = new Dexie('w1k-migrate');
    v1.version(1).stores({ settings: '&key' });
    await v1.table('settings').put({ key: 'theme', value: 'night' });
    v1.close();

    database = new TartanDB('w1k-migrate');
    expect(await getSetting('theme', 'system', database)).toBe('night');
    expect(await database.progress.count()).toBe(0);
    expect(await database.reviewLog.count()).toBe(0);
    expect(await database.scarves.count()).toBe(0);
  });
});

describe('progress', () => {
  it('returns undefined for unknown items and round-trips puts', async () => {
    const d = fresh();
    expect(await getProgress('lex:gaol', d)).toBeUndefined();
    await putProgress(progress('lex:gaol', null), d);
    expect((await getProgress('lex:gaol', d))?.phase).toBe('learning');
  });

  it('put replaces the existing row', async () => {
    const d = fresh();
    await putProgress(progress('lex:gaol', null), d);
    await putProgress(progress('lex:gaol', 10), d);
    expect(await d.progress.count()).toBe(1);
    expect((await getProgress('lex:gaol', d))?.fsrs?.due).toBe(10);
  });

  it('lists only items due at or before now, soonest first, skipping unscheduled', async () => {
    const d = fresh();
    await putProgress(progress('a', 300), d);
    await putProgress(progress('b', 100), d);
    await putProgress(progress('c', 500), d);
    await putProgress(progress('d', null), d);
    const due = await listDueProgress(300, d);
    expect(due.map((p) => p.itemId)).toEqual(['b', 'a']);
  });
});

describe('review log', () => {
  it('appends events with generated ids and lists them oldest first', async () => {
    const d = fresh();
    await appendReview(review('a', 20), d);
    await appendReview(review('b', 10), d);
    const all = await listReviews(undefined, d);
    expect(all.map((r) => r.at)).toEqual([10, 20]);
    expect(all.every((r) => typeof r.id === 'number')).toBe(true);
  });

  it('filters by item', async () => {
    const d = fresh();
    await appendReview(review('a', 1), d);
    await appendReview(review('b', 2), d);
    expect((await listReviews('a', d)).map((r) => r.itemId)).toEqual(['a']);
  });
});

describe('scarves', () => {
  it('creates, reads, updates, lists newest first and deletes', async () => {
    const d = fresh();
    await putScarf(scarf('s1', 1), d);
    await putScarf(scarf('s2', 2), d);
    expect((await listScarves(d)).map((s) => s.id)).toEqual(['s2', 's1']);

    await putScarf(scarf('s1', 1, { wovenOrder: ['lex:gaol'], pausedAt: 5 }), d);
    expect(await getScarf('s1', d)).toMatchObject({ wovenOrder: ['lex:gaol'], pausedAt: 5 });

    await deleteScarf('s1', d);
    expect(await getScarf('s1', d)).toBeUndefined();
    expect(await listScarves(d)).toHaveLength(1);
  });
});

describe('export and import', () => {
  it('round-trips every table through JSON into another database', async () => {
    const a = fresh();
    await setSetting('theme', 'night', a);
    await putProgress(progress('a', 5), a);
    await putScarf(scarf('s1', 1), a);
    await appendReview(review('a', 3), a);
    const json = await exportBackup(a);

    const b = new TartanDB('w1k-import');
    try {
      await setSetting('theme', 'light', b);
      await putScarf(scarf('stale', 9), b);
      await importBackup(json, b);
      expect(await getSetting('theme', 'system', b)).toBe('night');
      expect((await listScarves(b)).map((s) => s.id)).toEqual(['s1']);
      expect(await getProgress('a', b)).toEqual(progress('a', 5));
      expect(await listReviews(undefined, b)).toHaveLength(1);
    } finally {
      await b.delete();
    }
  });

  it('rejects malformed input without touching existing data', async () => {
    const d = fresh();
    await putScarf(scarf('keep', 1), d);
    await expect(importBackup('not json', d)).rejects.toThrow();
    await expect(importBackup(JSON.stringify({ format: 'other' }), d)).rejects.toThrow(/backup/i);
    await expect(
      importBackup(JSON.stringify({ format: 'tartan-talk-backup', version: 2, scarves: 'x' }), d),
    ).rejects.toThrow(/backup/i);
    expect((await listScarves(d)).map((s) => s.id)).toEqual(['keep']);
  });
});
