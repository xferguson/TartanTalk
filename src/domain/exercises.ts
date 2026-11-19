/**
 * Exercise builder: turns an item plus the learner's known items into a
 * recognise, cloze or produce prompt. Pure; randomness is injected so tests
 * and replays are deterministic.
 */
import { isDue } from './scheduler';
import type { Form, ItemId, LearnableItem, Lexeme, Progress, Sentence } from './types';

export type Rng = () => number; // [0, 1)

export const MAX_OPTIONS = 4;

/** Small deterministic generator (mulberry32) for seeding builders. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ChoiceOption {
  text: string;
  correct: boolean;
}

/** "Choose the meaning": the Gaelic is shown, the learner picks the English. */
export interface RecogniseExercise {
  type: 'recognise';
  itemId: ItemId;
  prompt: string; // Gaelic
  options: ChoiceOption[]; // English, shuffled, exactly one correct
}

/** "Fill the gap": one tracked token of a sentence is blanked. */
export interface ClozeExercise {
  type: 'cloze';
  itemId: ItemId; // the sentence
  targetId: ItemId; // the item being tested (the blanked token's item)
  tokens: (string | null)[]; // sentence tokens with the blank as null
  blankIndex: number;
  answer: string;
  options: ChoiceOption[]; // Gaelic, shuffled, exactly one correct
  translation: string; // English hint
}

/** "Type the Gaelic": the English is shown. */
export interface ProduceExercise {
  type: 'produce';
  itemId: ItemId;
  prompt: string; // English
  answer: string;
  altAnswers: string[];
}

export type Exercise = RecogniseExercise | ClozeExercise | ProduceExercise;

export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const SENTENCE_PUNCT = /[.!?,;:]+$/;
const splitPunct = (text: string): { core: string; tail: string } => {
  const tail = SENTENCE_PUNCT.exec(text)?.[0] ?? '';
  return { core: text.slice(0, text.length - tail.length), tail };
};

/** Higher = more plausible as a confusable. */
function similarity(target: LearnableItem, other: LearnableItem): number {
  let score = 0;
  if (target.kind === 'form' && other.kind === 'form') {
    if (target.lexemeId === other.lexemeId) score += 4; // same preposition, other person
    if (target.person && target.person === other.person) score += 2;
  } else if (target.kind === 'lexeme' && other.kind === 'lexeme') {
    if (target.pos === other.pos) score += 3;
    if (target.gender && target.gender === other.gender) score += 1;
  } else if (target.kind === 'sentence' && other.kind === 'sentence') {
    if (target.pattern === other.pattern) score += 4;
  }
  score += other.tags.filter((t) => target.tags.includes(t)).length;
  return score;
}

/** Best confusables first; ties broken by the rng so the pick varies per call. */
function rankDistractors<T extends LearnableItem>(target: LearnableItem, pool: readonly T[], text: (i: T) => string, rng: Rng, avoid: string): T[] {
  const seen = new Set<string>([avoid]);
  const unique: T[] = [];
  for (const item of shuffle(pool, rng)) {
    const t = text(item);
    if (item.id === target.id || seen.has(t)) continue;
    seen.add(t);
    unique.push(item);
  }
  return unique.sort((a, b) => similarity(target, b) - similarity(target, a));
}

function toOptions(correct: string, distractors: string[], rng: Rng): ChoiceOption[] {
  return shuffle(
    [{ text: correct, correct: true }, ...distractors.slice(0, MAX_OPTIONS - 1).map((text) => ({ text, correct: false }))],
    rng,
  );
}

export function buildRecognise(item: LearnableItem, known: readonly LearnableItem[], rng: Rng): RecogniseExercise {
  const pool = known.filter((k) => k.kind === item.kind);
  const wrong = rankDistractors(item, pool, (i) => i.en, rng, item.en).map((i) => i.en);
  return { type: 'recognise', itemId: item.id, prompt: item.gd, options: toOptions(item.en, wrong, rng) };
}

const trackedIndexes = (s: Sentence): number[] => s.tokens.flatMap((t, i) => (t.itemId ? [i] : []));

/**
 * The words of a sentence that a cloze may blank. A blank is a review of that
 * one word, so only words in play qualify: one being learned in this run, or
 * one due for review. A word marked known, or one resting until its next
 * review, is never singled out; the sentence can still be typed whole.
 */
export function clozeTargets(
  sentence: Sentence,
  progress: ReadonlyMap<ItemId, Progress>,
  now: number,
  practising: readonly ItemId[],
): ItemId[] {
  const inPlay = (id: ItemId) => {
    const p = progress.get(id);
    return practising.includes(id) || (p !== undefined && isDue(p, now));
  };
  return [...new Set(sentence.tokens.flatMap((t) => (t.itemId && inPlay(t.itemId) ? [t.itemId] : [])))];
}

/**
 * Blank one tracked token. Pass `target` to test a specific item (e.g. the
 * focal word of a card), or a set to choose at random among those items;
 * otherwise any tracked token may be chosen. Returns null when the sentence
 * has nothing to blank.
 */
export function buildCloze(
  sentence: Sentence,
  known: readonly LearnableItem[],
  rng: Rng,
  target?: ItemId | ReadonlySet<ItemId>,
): ClozeExercise | null {
  const allowed = (id: ItemId | null) =>
    target === undefined || (typeof target === 'string' ? id === target : id !== null && target.has(id));
  const candidates = trackedIndexes(sentence).filter((i) => allowed(sentence.tokens[i].itemId));
  const blankIndex = typeof target === 'string' ? candidates[0] : candidates[Math.floor(rng() * candidates.length)];
  if (blankIndex === undefined) return null;

  const token = sentence.tokens[blankIndex];
  const targetItem = known.find((k) => k.id === token.itemId);
  const { core: answer } = splitPunct(token.text);
  // Distractors come from known words and forms, never whole sentences.
  const pool = known.filter((k): k is Lexeme | Form => k.kind !== 'sentence');
  const wrong = targetItem
    ? rankDistractors(targetItem, pool, (i) => i.gd, rng, answer).map((i) => i.gd)
    : [];
  return {
    type: 'cloze',
    itemId: sentence.id,
    targetId: targetItem?.id ?? token.itemId ?? '',
    tokens: sentence.tokens.map((t, i) => (i === blankIndex ? null : t.text)),
    blankIndex,
    answer,
    options: toOptions(answer, wrong, rng),
    translation: sentence.en,
  };
}

export function buildProduce(item: LearnableItem): ProduceExercise {
  return {
    type: 'produce',
    itemId: item.id,
    prompt: item.en,
    answer: item.gd,
    altAnswers: item.kind === 'sentence' ? [...item.altGd] : [],
  };
}
