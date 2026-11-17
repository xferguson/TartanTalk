import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  RELEARN_DELAY_MS,
  isDue,
  markLearned,
  newProgress,
  nextIntervalDays,
  retrievability,
  review,
  stabilityAfter,
} from '../../src/domain/scheduler';
import type { Progress } from '../../src/domain/types';

const T0 = Date.UTC(2026, 10, 1, 9, 0, 0);
const days = (n: number) => n * DAY_MS;

function learned(): Progress {
  return markLearned(newProgress('lex:gaol'), T0, 'scarf-love');
}

/** Reviews on each due date with the given ratings and returns the final progress. */
function walk(ratings: Parameters<typeof review>[1][], start = learned()): Progress {
  let p = start;
  for (const r of ratings) p = review(p, r, p.fsrs!.due);
  return p;
}

describe('newProgress', () => {
  it('starts as a new, unwoven, unscheduled item', () => {
    const p = newProgress('lex:gaol');
    expect(p).toMatchObject({ itemId: 'lex:gaol', phase: 'new', fsrs: null, wovenAt: null, ownerScarfId: null, tangled: false });
  });
});

describe('markLearned', () => {
  it('weaves the item, assigns the owner scarf and schedules the first review one day out', () => {
    const p = learned();
    expect(p.phase).toBe('review');
    expect(p.wovenAt).toBe(T0);
    expect(p.ownerScarfId).toBe('scarf-love');
    expect(p.seededStep).toBe(1);
    expect(p.fsrs?.due).toBe(T0 + days(1));
    expect(p.fsrs?.stability).toBeGreaterThan(0);
  });

  it('clears a tangle on relearning but keeps the original weave and owner', () => {
    const tangled = walk(['again', 'again']);
    expect(tangled.tangled).toBe(true);
    const relearned = markLearned(tangled, T0 + days(3), 'another-scarf');
    expect(relearned.tangled).toBe(false);
    expect(relearned.consecutiveMisses).toBe(0);
    expect(relearned.wovenAt).toBe(T0);
    expect(relearned.ownerScarfId).toBe('scarf-love');
    expect(relearned.fsrs?.due).toBe(T0 + days(3) + days(1));
  });
});

describe('seeded ladder', () => {
  it('schedules Good reviews at 1, 4 and 16 days, then hands over to FSRS', () => {
    const p1 = walk(['good']);
    expect(p1.fsrs!.due - p1.fsrs!.lastReview).toBe(days(4));
    expect(p1.seededStep).toBe(2);

    const p2 = walk(['good', 'good']);
    expect(p2.fsrs!.due - p2.fsrs!.lastReview).toBe(days(16));
    expect(p2.seededStep).toBe(3);

    const p3 = walk(['good', 'good', 'good']);
    expect(p3.seededStep).toBeGreaterThanOrEqual(3);
    const fsrsInterval = p3.fsrs!.due - p3.fsrs!.lastReview;
    expect(fsrsInterval).toBeGreaterThan(days(16));
  });

  it('nudges within the step: Hard halves the interval and Easy adds half again', () => {
    const base = learned();
    const hard = review(base, 'hard', base.fsrs!.due);
    const easy = review(base, 'easy', base.fsrs!.due);
    expect(hard.fsrs!.due - hard.fsrs!.lastReview).toBe(days(2));
    expect(easy.fsrs!.due - easy.fsrs!.lastReview).toBe(days(6));
  });
});

describe('misses and tangles', () => {
  it('a first miss relearns after ten minutes and restarts the ladder, without tangling', () => {
    const p = walk(['good', 'again']);
    expect(p.fsrs!.due - p.fsrs!.lastReview).toBe(RELEARN_DELAY_MS);
    expect(p.seededStep).toBe(0);
    expect(p.consecutiveMisses).toBe(1);
    expect(p.tangled).toBe(false);
    expect(p.phase).toBe('review');
    expect(p.fsrs!.lapses).toBe(1);
  });

  it('two misses in a row tangle the item and send it back to the learning ladder', () => {
    const p = walk(['again', 'again']);
    expect(p.tangled).toBe(true);
    expect(p.phase).toBe('learning');
    expect(p.ladderStep).toBe(0);
    expect(p.correctInSession).toBe(0);
  });

  it('a correct answer between misses resets the streak', () => {
    const p = walk(['again', 'good', 'again']);
    expect(p.consecutiveMisses).toBe(1);
    expect(p.tangled).toBe(false);
  });
});

describe('FSRS phase', () => {
  it('asks for shorter intervals when the desired retention is higher', () => {
    const ready = walk(['good', 'good', 'good']);
    const at = ready.fsrs!.due;
    const relaxed = review(ready, 'good', at, { retention: 0.8 });
    const strict = review(ready, 'good', at, { retention: 0.95 });
    expect(strict.fsrs!.due - at).toBeLessThan(relaxed.fsrs!.due - at);
  });
});

describe('retrievability and due', () => {
  it('is 1 for items that have never been scheduled', () => {
    expect(retrievability(newProgress('x'), T0)).toBe(1);
  });

  it('falls over time', () => {
    const p = learned();
    const soon = retrievability(p, T0 + days(1));
    const later = retrievability(p, T0 + days(30));
    expect(soon).toBeLessThan(1);
    expect(later).toBeLessThan(soon);
  });

  it('reports due once the scheduled time has passed', () => {
    const p = learned();
    expect(isDue(p, T0 + days(1) - 1)).toBe(false);
    expect(isDue(p, T0 + days(1))).toBe(true);
    expect(isDue(newProgress('x'), T0)).toBe(false);
  });
});

describe('hints and credit helpers', () => {
  it('predicts the same interval that a review would schedule', () => {
    const p = walk(['good']);
    const at = p.fsrs!.due;
    for (const rating of ['hard', 'good', 'easy'] as const) {
      const after = review(p, rating, at);
      expect(nextIntervalDays(p, rating, at)).toBeCloseTo((after.fsrs!.due - at) / DAY_MS, 5);
    }
  });

  it('reports a larger stability after Good than after Hard', () => {
    const p = walk(['good', 'good', 'good']);
    const at = p.fsrs!.due;
    expect(stabilityAfter(p, 'good', at)).toBeGreaterThan(stabilityAfter(p, 'hard', at));
  });

  it('does not mutate its input', () => {
    const p = learned();
    const snapshot = structuredClone(p);
    review(p, 'again', p.fsrs!.due);
    expect(p).toEqual(snapshot);
  });
});
