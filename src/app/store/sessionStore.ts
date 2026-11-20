import { create } from 'zustand';
import type { Exercise } from '../../domain/exercises';
import type { Card, IntroResponse } from '../../domain/session';
import type { ItemId, Rating } from '../../domain/types';
import {
  answerLearning,
  buildExercise,
  buildReviewExercise,
  capRating,
  claimKnown,
  checkExercise,
  defaultRating,
  planReweave,
  respondToIntroduction,
  rateReview,
  startLearning,
  startTangles,
  upNext,
  type ExerciseCheck,
  type LoomSession,
  type ServiceDeps,
} from '../services';

export type SessionMode = 'learn' | 'tangles' | 'reweave';

export interface Feedback {
  check: ExerciseCheck;
  /** The rating a reweave answer will be saved with unless the learner changes it. Null while learning. */
  suggestedRating: Rating | null;
  /** True when a reweave answer is waiting for the learner's rating. */
  awaitingRating: boolean;
}

export interface Weaving {
  itemId: ItemId;
  ells: number;
}

export interface SessionState {
  mode: SessionMode | null;
  scarfId: string | null;
  loom: LoomSession | null;
  /** Reweave items still to ask, front first. */
  queue: ItemId[];
  /** Reweave items waiting for a tangle session instead. */
  tangledLeft: number;
  /** Reweave items missed once this session and already given their second try. */
  retried: ItemId[];
  card: Card | null;
  itemId: ItemId | null;
  exercise: Exercise | null;
  feedback: Feedback | null;
  /** Item just woven, for the weaving moment. */
  weaving: Weaving | null;
  /** Gaelic words that earned partial credit from the last sentence answer. */
  credited: ItemId[];
  /** True when the last answer was the first correct one for a sentence never seen before. */
  canClaimKnown: boolean;
  /** When the next missed card is ready, if the only cards left are waiting. */
  waitUntil: number | null;
  done: boolean;
  /** True when the last request for more found no new items left on this scarf. */
  exhausted: boolean;
  /** Counts for progress bars. */
  total: number;
  answered: number;
}

export interface SessionActions {
  startLearning(scarfId: string): Promise<void>;
  /** Starts another batch of new items on the same scarf, carrying over anything still resting. */
  keepWeaving(): Promise<void>;
  startTangles(scarfId?: string): Promise<void>;
  startReweave(scarfId?: string): Promise<void>;
  /** Answers the introduce card: got it, later, or already known. */
  introduce(response: IntroResponse): Promise<void>;
  /** Marks a response (chosen option text, or typed Gaelic) and saves what can be saved now. */
  submit(response: string): Promise<void>;
  /** After a first correct answer to a new sentence: it was already known, so count it and move on. */
  claimKnown(): Promise<void>;
  /** Saves a reweave answer with the learner's rating. */
  rate(rating: Rating): Promise<void>;
  /** Moves to the next card. */
  next(): Promise<void>;
  reset(): void;
}

const idle: SessionState = {
  mode: null,
  scarfId: null,
  loom: null,
  queue: [],
  tangledLeft: 0,
  retried: [],
  card: null,
  itemId: null,
  exercise: null,
  feedback: null,
  weaving: null,
  credited: [],
  canClaimKnown: false,
  waitUntil: null,
  done: false,
  exhausted: false,
  total: 0,
  answered: 0,
};

/** Deps come from a getter so tests can inject fakes and the app can build them lazily. */
export function createSessionStore(getDeps: () => ServiceDeps) {
  return create<SessionState & SessionActions>()((set, get) => {
    /** Shows the card or item that is up next, or marks the session done / waiting. */
    async function show(): Promise<void> {
      const deps = getDeps();
      const { mode, loom, queue } = get();
      if (mode === 'reweave') {
        const itemId = queue[0];
        if (!itemId) return set({ card: null, itemId: null, exercise: null, done: true });
        const exercise = await buildReviewExercise(deps, itemId);
        return set({ itemId, exercise, card: null, feedback: null, weaving: null, credited: [], canClaimKnown: false, waitUntil: null, done: false });
      }
      if (!loom) return;
      const up = upNext(loom, deps.clock.now());
      if (up.type === 'done') return set({ card: null, itemId: null, exercise: null, canClaimKnown: false, done: true, waitUntil: null });
      if (up.type === 'wait') return set({ card: null, itemId: null, exercise: null, canClaimKnown: false, done: false, waitUntil: up.until });
      // An introduce card shows the word and its meaning, so there is no exercise to build.
      if (up.card.exercise === 'introduce') {
        return set({ card: up.card, itemId: up.card.itemId, exercise: null, feedback: null, weaving: null, credited: [], canClaimKnown: false, waitUntil: null, done: false });
      }
      const exercise = await buildExercise(deps, up.card, loom);
      set({ card: up.card, itemId: up.card.itemId, exercise, feedback: null, weaving: null, credited: [], canClaimKnown: false, waitUntil: null, done: false });
    }

    async function begin(mode: SessionMode, scarfId: string | null, loom: LoomSession | null, queue: ItemId[], tangledLeft = 0) {
      const total = loom ? loom.session.queue.length : queue.length;
      set({ ...idle, mode, scarfId, loom, queue, tangledLeft, total });
      await show();
    }

    return {
      ...idle,

      async startLearning(scarfId) {
        const loom = await startLearning(getDeps(), scarfId);
        if (!loom) return set({ ...idle, done: true });
        await begin('learn', scarfId, loom, []);
        set({ exhausted: loom.batchWords.length === 0 });
      },

      async keepWeaving() {
        const { scarfId, loom } = get();
        if (!scarfId) return;
        const next = await startLearning(getDeps(), scarfId, loom ?? undefined);
        if (!next) return;
        await begin('learn', scarfId, next, []);
        set({ exhausted: next.batchWords.length === 0 });
      },

      async startTangles(scarfId) {
        await begin('tangles', scarfId ?? null, await startTangles(getDeps(), scarfId), []);
      },

      async startReweave(scarfId) {
        const plan = await planReweave(getDeps(), scarfId);
        await begin('reweave', scarfId ?? null, null, plan.due, plan.tangled.length);
      },

      async introduce(response) {
        const { card, loom } = get();
        if (!card || !loom || card.exercise !== 'introduce') return;
        const outcome = await respondToIntroduction(getDeps(), loom, card, response);
        // A word put off for later leaves this run, so the bar should not wait for it.
        set({ loom: outcome.loom, answered: get().answered + (outcome.known ? 1 : 0), total: response === 'later' ? Math.max(get().total - 1, 0) : get().total });
        await show();
      },

      async submit(response) {
        const deps = getDeps();
        const { mode, exercise, card, loom, itemId, feedback } = get();
        if (!exercise || !itemId || feedback) return;
        const check = checkExercise(exercise, response);

        if (mode === 'reweave') {
          // A miss is saved at once as Again; a correct answer waits for the learner's rating.
          if (!check.correct) {
            const { progress } = await rateReview(deps, itemId, 'again', exercise);
            const { queue, retried, tangledLeft, total, answered } = get();
            const rest = queue.slice(1);
            // A first miss earns a second try at the very end of the session. A second miss
            // (or one that tangles at once) is a tangle: no third try, it goes to Tangles.
            const retry = !progress.tangled && !retried.includes(itemId);
            return set({
              feedback: { check, suggestedRating: 'again', awaitingRating: false },
              queue: retry ? [...rest, itemId] : rest,
              retried: retry ? [...retried, itemId] : retried,
              total: retry ? total + 1 : total,
              tangledLeft: progress.tangled ? tangledLeft + 1 : tangledLeft,
              answered: retry ? answered : answered + 1,
            });
          }
          return set({ feedback: { check, suggestedRating: defaultRating(check), awaitingRating: true } });
        }

        if (!card || !loom) return;
        const outcome = await answerLearning(deps, loom, card, exercise, check.correct);
        set({
          loom: outcome.loom,
          feedback: { check, suggestedRating: null, awaitingRating: false },
          weaving: outcome.learned ? { itemId: outcome.learned, ells: outcome.ells } : null,
          credited: outcome.credited.map((c) => c.itemId),
          canClaimKnown: outcome.canClaimKnown,
          answered: get().answered + (outcome.learned ? 1 : 0),
          total: Math.max(get().total, outcome.loom.session.queue.length + outcome.loom.woven.length),
        });
      },

      async claimKnown() {
        const { canClaimKnown, loom, itemId } = get();
        if (!canClaimKnown || !loom || !itemId) return;
        set({ loom: await claimKnown(getDeps(), loom, itemId), canClaimKnown: false, answered: get().answered + 1 });
        await show();
      },

      async rate(rating) {
        const deps = getDeps();
        const { feedback, exercise, itemId, queue } = get();
        if (!feedback?.awaitingRating || !exercise || !itemId) return;
        const outcome = await rateReview(deps, itemId, capRating(rating, feedback.check), exercise);
        set({
          feedback: { ...feedback, awaitingRating: false, suggestedRating: capRating(rating, feedback.check) },
          queue: queue.slice(1),
          credited: outcome.credited.map((c) => c.itemId),
          answered: get().answered + 1,
        });
        // Choosing a rating is the learner's "done with this one", so go straight on.
        await show();
      },

      async next() {
        await show();
      },

      reset() {
        set({ ...idle });
      },
    };
  });
}

export type SessionStore = ReturnType<typeof createSessionStore>;
