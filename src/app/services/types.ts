import type { Clock } from '../clock';
import type { TartanDB } from '../../db/db';
import type { Rng } from '../../domain/exercises';
import type { ItemId, LearnableItem } from '../../domain/types';

/** Everything a service needs from the outside world, injected so tests can fake it. */
export interface ServiceDeps {
  db: TartanDB;
  clock: Clock;
  /** Every learnable item by id. */
  items: ReadonlyMap<ItemId, LearnableItem>;
  rng: Rng;
}
