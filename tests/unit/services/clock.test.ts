import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createDevClock, loadClockOffset, saveClockOffset } from '../../../src/app/clock';
import { TartanDB } from '../../../src/db/db';

let database: TartanDB | undefined;
afterEach(async () => {
  await database?.delete();
  database = undefined;
});

describe('dev clock', () => {
  it('runs ahead of the base clock by its offset', () => {
    const clock = createDevClock(() => 1000);
    expect(clock.now()).toBe(1000);
    clock.advance(500);
    clock.advance(500);
    expect(clock.now()).toBe(2000);
    clock.reset();
    expect(clock.now()).toBe(1000);
  });

  it('keeps its offset across reloads', async () => {
    database = new TartanDB('w2b-clock');
    const a = createDevClock(() => 0, 3 * 86_400_000);
    await saveClockOffset(a, database);
    const b = createDevClock(() => 0);
    await loadClockOffset(b, database);
    expect(b.offsetMs).toBe(3 * 86_400_000);
  });

  it('ignores a stored offset that is not a number', async () => {
    database = new TartanDB('w2b-clock-bad');
    await database.settings.put({ key: 'devClockOffsetMs', value: 'soon' });
    const clock = createDevClock(() => 0, 5);
    await loadClockOffset(clock, database);
    expect(clock.offsetMs).toBe(0);
  });
});
