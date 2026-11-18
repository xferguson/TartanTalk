/**
 * Learning sessions (W1-F): word batches, the sentences they unlock, card
 * spacing, and the in-session learning ladder.
 *
 * A new word is first introduced (word and meaning, no quiz). "Got it" then
 * checks it at once with recognition; "Later" snoozes it for 24 hours; "I
 * already know this" counts it as known without a quiz.
 *
 * Rhythm: learn 3-4 words, then up to two unlocked sentences per new word
 * (the rest are held back for later), then more words. Cards that share a
 * focal word are kept apart, and sentences with the same pattern are not
 * shown back to back. These are soft preferences: every card is still shown.
 *
 * Pure: functions take `now` and return new values.
 */
import type { ExerciseType, ItemId, LearnableItem, Sentence } from './types';
import { isUnlocked, matchesFilter, trackedTokens } from './unlock';

export const LADDER: readonly ExerciseType[] = ['recognise', 'cloze', 'produce'];
export const CORRECT_TO_LEARN = 2;
export const DEFAULT_BATCH_SIZE = 4;
export const SENTENCES_PER_NEW_WORD = 2;
/** Cards sharing a focal word should be at least this many positions apart. */
export const MIN_FOCAL_GAP = 4;
export const RELEARN_AFTER_MS = 10 * 60 * 1000;
/** How long "Later" holds a word back. */
export const LATER_MS = 24 * 60 * 60 * 1000;
/** A supporting word (tha, a noun) counts for less than a word the scarf is about. */
const SUPPORT_WEIGHT = 0.25;
/** Frequency rank used for items without one, so ranked words come first. */
const UNRANKED = 10_000;

const rank = (item: LearnableItem | undefined) => (item && item.kind === 'lexeme' && item.freqRank) || UNRANKED;

/* ---------- Choosing words ---------- */

export interface PlanWordBatchInput {
  candidates: readonly LearnableItem[];
  learned: ReadonlySet<ItemId>;
  size?: number;
  /** The scarf's tags: words matching them are what it is about; the rest only support sentences. */
  tagFilter?: readonly string[];
  /** Words put off with "Later", mapped to when they may return. */
  snoozed?: ReadonlyMap<ItemId, number>;
  now?: number;
}

/**
 * Picks the next words to learn, sentence first. Each sentence is scored by the
 * scarf words it would teach (supporting words count a quarter) per new word it
 * costs, so cheap sentences that bring a fresh form win, and a form that is
 * already known is never taught again just to reuse a noun. Words shared with
 * the batch so far cost nothing. If no sentence fits in the room left, it
 * starts on the cheapest one so the next batch can finish it. Only then does it
 * fall back to the most frequent words.
 */
export function planWordBatch({ candidates, learned, size = DEFAULT_BATCH_SIZE, tagFilter, snoozed, now = 0 }: PlanWordBatchInput): ItemId[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const words = candidates.filter((c) => c.kind !== 'sentence' && !learned.has(c.id) && (snoozed?.get(c.id) ?? 0) <= now);
  const available = new Set(words.map((w) => w.id));
  const sentences = candidates.filter((c): c is Sentence => c.kind === 'sentence' && !learned.has(c.id));
  const batch: ItemId[] = [];
  const weight = (id: ItemId) => {
    const item = byId.get(id);
    return !tagFilter || (item && matchesFilter(item, tagFilter)) ? 1 : SUPPORT_WEIGHT;
  };
  const byValue = (a: ItemId, b: ItemId) => weight(b) - weight(a) || rank(byId.get(a)) - rank(byId.get(b)) || a.localeCompare(b);

  while (batch.length < size) {
    const have = new Set([...learned, ...batch]);
    const options = sentences
      .map((s) => ({ s, missing: [...new Set(trackedTokens(s))].filter((id) => !have.has(id)) }))
      .filter(({ missing }) => missing.length > 0 && missing.every((id) => available.has(id)))
      .map((o) => ({
        ...o,
        score: o.missing.reduce((sum, id) => sum + weight(id), 0) / o.missing.length,
        cost: o.missing.reduce((sum, id) => sum + rank(byId.get(id)), 0),
      }));
    const room = size - batch.length;
    const fits = options.filter((o) => o.missing.length <= room);
    const pool = fits.length > 0 ? fits : options;
    if (pool.length === 0) break;
    pool.sort((a, b) =>
      fits.length > 0
        ? b.score - a.score || a.missing.length - b.missing.length || a.cost - b.cost || a.s.id.localeCompare(b.s.id)
        : a.missing.length - b.missing.length || b.score - a.score || a.cost - b.cost || a.s.id.localeCompare(b.s.id),
    );
    const missing = [...pool[0].missing].sort(byValue);
    batch.push(...missing.slice(0, room));
    if (fits.length === 0) break;
  }

  const rest = words.filter((w) => !batch.includes(w.id)).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
  for (const w of rest) {
    if (batch.length >= size) break;
    batch.push(w.id);
  }
  return batch;
}

/* ---------- Choosing sentences ---------- */

export interface SelectSentencesInput {
  sentences: readonly Sentence[];
  learned: ReadonlySet<ItemId>;
  newWords: readonly ItemId[];
  perWord?: number;
}

/**
 * From the sentences unlocked for the batch's new words, offers at most
 * `perWord` per new word now, preferring new partner words and patterns.
 * The rest are deferred to later sessions so a word is proven in varied
 * contexts over time rather than drilled in one sitting.
 */
export function selectSentences({ sentences, learned, newWords, perWord = SENTENCES_PER_NEW_WORD }: SelectSentencesInput): {
  now: Sentence[];
  deferred: Sentence[];
} {
  const fresh = new Set(newWords);
  const eligible = sentences.filter(
    (s) => !learned.has(s.id) && isUnlocked(s, learned) && trackedTokens(s).some((id) => fresh.has(id)),
  );
  const counts = new Map<ItemId, number>();
  const usedTokens = new Set<ItemId>();
  const now: Sentence[] = [];
  let remaining = [...eligible];

  for (;;) {
    const fits = remaining.filter((s) => trackedTokens(s).every((id) => !fresh.has(id) || (counts.get(id) ?? 0) < perWord));
    if (fits.length === 0) break;
    const lastPattern = now.at(-1)?.pattern;
    const score = (s: Sentence) => new Set(trackedTokens(s).filter((id) => !usedTokens.has(id))).size;
    fits.sort(
      (a, b) =>
        score(b) - score(a) ||
        Number(a.pattern === lastPattern) - Number(b.pattern === lastPattern) ||
        a.id.localeCompare(b.id),
    );
    const pick = fits[0];
    now.push(pick);
    for (const id of new Set(trackedTokens(pick))) {
      usedTokens.add(id);
      if (fresh.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    remaining = remaining.filter((s) => s !== pick);
  }
  return { now, deferred: remaining };
}

/* ---------- Cards and spacing ---------- */

/** `introduce` shows a new word and its meaning without asking anything. */
export type CardStage = 'introduce' | ExerciseType;

export interface Card {
  itemId: ItemId;
  exercise: CardStage;
  /** Words this card practises; used to keep related cards apart. */
  focal: ItemId[];
  /** Sentence skeleton, for avoiding back-to-back look-alikes. */
  pattern?: string;
  batch: number;
}

const sharesFocal = (a: Card, b: Card) => a.focal.some((id) => b.focal.includes(id));

/**
 * Orders cards so that cards sharing a focal word are `minGap` apart and the
 * same sentence pattern is not repeated back to back. When that is impossible
 * it relaxes the pattern rule first, then picks the card whose focal words were
 * seen longest ago.
 */
export function orderCards(cards: readonly Card[], minGap = MIN_FOCAL_GAP): Card[] {
  const out: Card[] = [];
  const left = [...cards];
  const recent = () => out.slice(-(minGap - 1));
  const gapOk = (c: Card) => !recent().some((r) => sharesFocal(r, c));
  const patternOk = (c: Card) => !c.pattern || c.pattern !== out.at(-1)?.pattern;
  const distance = (c: Card) => {
    for (let i = out.length - 1; i >= 0; i--) if (sharesFocal(out[i], c)) return out.length - i;
    return Infinity;
  };

  while (left.length > 0) {
    let i = left.findIndex((c) => gapOk(c) && patternOk(c));
    if (i < 0) i = left.findIndex(gapOk);
    if (i < 0) {
      i = 0;
      for (let k = 1; k < left.length; k++) if (distance(left[k]) > distance(left[i])) i = k;
    }
    out.push(left.splice(i, 1)[0]);
  }
  return out;
}

/* ---------- The in-session ladder ---------- */

export interface WaitingCard {
  card: Card;
  notBefore: number;
}

export interface Session {
  batch: number;
  queue: Card[];
  /** Missed cards, returned after `notBefore` and once their batch is finished. */
  waiting: WaitingCard[];
  correct: Record<ItemId, number>;
}

export interface StartBatchInput {
  words: readonly ItemId[];
  sentences?: readonly Sentence[];
  batch: number;
  /** Carry over waiting cards and correct counts from an earlier batch. */
  previous?: Session;
}

export function startBatch({ words, sentences = [], batch, previous }: StartBatchInput): Session {
  const cards: Card[] = [
    ...words.map((id) => ({ itemId: id, exercise: 'introduce' as const, focal: [id], batch })),
    ...sentences.map((s) => ({ itemId: s.id, exercise: LADDER[0], focal: [s.id, ...trackedTokens(s)], pattern: s.pattern, batch })),
  ];
  return {
    batch,
    queue: orderCards(cards),
    waiting: previous?.waiting ?? [],
    correct: previous?.correct ?? {},
  };
}

export type NextCard = { type: 'card'; card: Card } | { type: 'wait'; until: number } | { type: 'done' };

export function nextCard(session: Session, now: number): NextCard {
  const batchOpen = (b: number) => session.queue.some((c) => c.batch === b);
  const ready = session.waiting
    .filter((w) => w.notBefore <= now && !batchOpen(w.card.batch))
    .sort((a, b) => a.notBefore - b.notBefore);
  if (ready.length > 0) return { type: 'card', card: ready[0].card };
  if (session.queue.length > 0) return { type: 'card', card: session.queue[0] };
  if (session.waiting.length > 0) return { type: 'wait', until: Math.min(...session.waiting.map((w) => w.notBefore)) };
  return { type: 'done' };
}

export type IntroResponse = 'got-it' | 'later' | 'known';

export interface IntroResult {
  session: Session;
  /** Always null: an introduction never learns a word, it only starts or skips it. */
  learned: null;
  /** Set when the learner said they already know the word: treat it as learned, but do not weave it. */
  known: ItemId | null;
  /** Set when the word was put off: do not offer it again before this time. */
  snoozedUntil: number | null;
}

/**
 * Handles the answer to an introduce card. "Got it" checks the word straight
 * away with recognition, so the learner is never quizzed on something unseen.
 */
export function respondToIntro(session: Session, card: Card, response: IntroResponse, now: number): IntroResult {
  const queue = session.queue.filter((c) => c !== card);
  if (response === 'got-it') {
    const check: Card = { ...card, exercise: LADDER[0] };
    return { session: { ...session, queue: [check, ...queue] }, learned: null, known: null, snoozedUntil: null };
  }
  return {
    session: { ...session, queue },
    learned: null,
    known: response === 'known' ? card.itemId : null,
    snoozedUntil: response === 'later' ? now + LATER_MS : null,
  };
}

export interface AnswerResult {
  session: Session;
  /** The item that has just been learned (ready to be woven), if any. */
  learned: ItemId | null;
}

/**
 * Records an answer to a learning card. Two correct answers learn the item;
 * a correct answer below that moves it up the ladder, a few cards later. A
 * miss sends the card to wait for ten minutes and the end of its batch.
 */
export function answerCard(session: Session, card: Card, correct: boolean, now: number): AnswerResult {
  if (card.exercise === 'introduce') throw new Error('An introduce card is answered with respondToIntro');
  const queue = session.queue.filter((c) => c !== card);
  const waiting = session.waiting.filter((w) => w.card !== card);

  if (!correct) {
    return { session: { ...session, queue, waiting: [...waiting, { card, notBefore: now + RELEARN_AFTER_MS }] }, learned: null };
  }

  const count = (session.correct[card.itemId] ?? 0) + 1;
  const correctCounts = { ...session.correct, [card.itemId]: count };
  if (count >= CORRECT_TO_LEARN) {
    return { session: { ...session, queue, waiting, correct: correctCounts }, learned: card.itemId };
  }

  const rung = Math.min(LADDER.indexOf(card.exercise) + 1, LADDER.length - 1); // card is a quiz card here
  const next: Card = { ...card, exercise: LADDER[rung] };
  const at = Math.min(MIN_FOCAL_GAP - 1, queue.length);
  return {
    session: { ...session, queue: [...queue.slice(0, at), next, ...queue.slice(at)], waiting, correct: correctCounts },
    learned: null,
  };
}
