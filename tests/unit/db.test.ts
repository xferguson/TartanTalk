import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { TartanDB, getSetting, setSetting } from '../../src/db/db';

let database: TartanDB;

afterEach(async () => {
  await database?.delete();
});

describe('settings storage', () => {
  it('returns the fallback when a setting is missing', async () => {
    database = new TartanDB('test-missing');
    expect(await getSetting('theme', 'system', database)).toBe('system');
  });

  it('round-trips a stored setting', async () => {
    database = new TartanDB('test-roundtrip');
    await setSetting('theme', 'night', database);
    expect(await getSetting('theme', 'system', database)).toBe('night');
  });
});
