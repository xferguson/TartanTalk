import { getSetting, setSetting, type TartanDB, db } from '../db/db';

/** Services read time only through this, so tests and the dev time-travel control can move it. */
export interface Clock {
  now(): number;
}

export interface DevClock extends Clock {
  readonly offsetMs: number;
  setOffset(ms: number): void;
  advance(ms: number): void;
  reset(): void;
}

export const CLOCK_OFFSET_KEY = 'devClockOffsetMs';

/** A clock that runs `offsetMs` ahead of `base`: the whole point of dev time travel is to see moths without waiting. */
export function createDevClock(base: () => number = Date.now, initialOffsetMs = 0): DevClock {
  let offsetMs = initialOffsetMs;
  return {
    now: () => base() + offsetMs,
    get offsetMs() {
      return offsetMs;
    },
    setOffset(ms) {
      offsetMs = ms;
    },
    advance(ms) {
      offsetMs += ms;
    },
    reset() {
      offsetMs = 0;
    },
  };
}

export async function loadClockOffset(clock: DevClock, database: TartanDB = db): Promise<void> {
  const stored = await getSetting<unknown>(CLOCK_OFFSET_KEY, 0, database);
  clock.setOffset(typeof stored === 'number' && Number.isFinite(stored) ? stored : 0);
}

export async function saveClockOffset(clock: DevClock, database: TartanDB = db): Promise<void> {
  await setSetting(CLOCK_OFFSET_KEY, clock.offsetMs, database);
}

/** The app's one clock. */
export const appClock: DevClock = createDevClock();
