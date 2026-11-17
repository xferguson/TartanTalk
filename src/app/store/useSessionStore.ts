import { db } from '../../db/db';
import { loadContent, indexItems } from '../../content';
import { seededRng } from '../../domain/exercises';
import { appClock } from '../clock';
import type { ServiceDeps } from '../services';
import { createSessionStore } from './sessionStore';

let deps: ServiceDeps | undefined;

/** Built on first use so importing the store never loads content. */
function appDeps(): ServiceDeps {
  deps ??= { db, clock: appClock, items: indexItems(loadContent()), rng: seededRng(Date.now() >>> 0) };
  return deps;
}

export const useSessionStore = createSessionStore(appDeps);
