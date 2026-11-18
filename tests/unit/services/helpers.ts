import { seededRng } from '../../../src/domain/exercises';
import { createDevClock, type DevClock } from '../../../src/app/clock';
import { respondToIntroduction, startLearning, type LoomSession, type ServiceDeps } from '../../../src/app/services';
import type { SessionStore } from '../../../src/app/store/sessionStore';
import { TartanDB } from '../../../src/db/db';
import { ALL_ITEMS } from '../fixtures/slice';

let n = 0;
export const T0 = Date.UTC(2026, 0, 1);
export const DAY = 24 * 60 * 60 * 1000;

export interface Harness {
  deps: ServiceDeps;
  clock: DevClock;
  database: TartanDB;
}

export function harness(): Harness {
  const database = new TartanDB(`w2b-${n++}`);
  const clock = createDevClock(() => T0);
  return { database, clock, deps: { db: database, clock, items: new Map(ALL_ITEMS.map((i) => [i.id, i])), rng: seededRng(7) } };
}

export const SCARF_TAGS = ['grammar:tha', 'topic:love', 'topic:languages', 'prep:aig', 'prep:air'];

/** Starts learning and says "Got it" to every introduce card, leaving only quiz cards. */
export async function learningPastIntros(deps: ServiceDeps, scarfId: string): Promise<LoomSession> {
  let loom = (await startLearning(deps, scarfId))!;
  for (let c = loom.session.queue.find((q) => q.exercise === 'introduce'); c; c = loom.session.queue.find((q) => q.exercise === 'introduce')) {
    loom = (await respondToIntroduction(deps, loom, c, 'got-it')).loom;
  }
  return loom;
}

/** Answers "Got it" while an introduce card is showing. */
export async function passIntros(store: SessionStore): Promise<void> {
  while (store.getState().card?.exercise === 'introduce') await store.getState().introduce('got-it');
}
