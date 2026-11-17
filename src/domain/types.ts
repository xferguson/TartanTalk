/**
 * Shared contracts for the vertical slice. Parallel tasks build against these
 * types, so change them only in a dedicated PR (see docs/WORKPLAN.md, "Contracts").
 */

export type ItemId = string; // e.g. "lex:gaol", "form:aig.1sg", "sent:love-001"
export type ItemKind = 'lexeme' | 'form' | 'sentence';
export type ReviewStatus = 'sourced' | 'generated' | 'unreviewed' | 'verified' | 'flagged';

export interface Source {
  /** Where the item came from, e.g. "Tatoeba #12345" or "AI draft (template love-01)". */
  ref: string;
  licence: string; // e.g. "CC BY 2.0 FR", "CC BY-SA 4.0"
  url?: string;
}

export interface Lexeme {
  kind: 'lexeme';
  id: ItemId;
  gd: string;
  en: string;
  pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'pronoun' | 'article' | 'conjunction' | 'particle' | 'numeral' | 'other';
  gender?: 'm' | 'f';
  freqRank?: number;
  tags: string[];
  audio?: string;
  source: Source;
  review: ReviewStatus;
}

export type Person = '1sg' | '2sg' | '3sg-m' | '3sg-f' | '1pl' | '2pl' | '3pl';

export interface Form {
  kind: 'form';
  id: ItemId;
  lexemeId: ItemId;
  gd: string;
  en: string;
  person?: Person;
  tags: string[];
  audio?: string;
  source: Source;
  review: ReviewStatus;
}

export interface SentenceToken {
  text: string;
  itemId: ItemId | null; // null for punctuation or untracked words
}

export interface Sentence {
  kind: 'sentence';
  id: ItemId;
  gd: string;
  en: string;
  altGd: string[];
  tokens: SentenceToken[];
  pattern: string; // skeleton for similarity spacing, e.g. "tha-N-aig-P-air-P"
  tags: string[];
  isIdiom?: boolean;
  audio?: string;
  source: Source;
  review: ReviewStatus;
}

export type LearnableItem = Lexeme | Form | Sentence;

export interface Tartan {
  id: string;
  name: string;
  clan: string;
  variant?: string;
  sett: string; // thread count, e.g. "B/30 R4 G/34"
  colours: Record<string, string>; // code -> hex
  scale?: number;
  provenance: { ref: string; url?: string; notes?: string };
  verified: boolean;
}

export interface Topic {
  id: string;
  name: string;
  tags: string[];
  starter?: boolean;
}

/* ---------- Learner state ---------- */

export type Phase = 'new' | 'learning' | 'review';
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type ExerciseType = 'recognise' | 'cloze' | 'produce';

export interface FsrsState {
  stability: number;
  difficulty: number;
  lastReview: number; // epoch ms
  due: number; // epoch ms
  reps: number;
  lapses: number;
}

export interface Progress {
  itemId: ItemId;
  phase: Phase;
  correctInSession: number;
  ladderStep: number; // index into the exercise ladder while learning
  seededStep: number; // 0 = next interval 1d, 1 = 4d, 2 = 16d, 3+ = FSRS
  fsrs: FsrsState | null;
  ownerScarfId: string | null;
  wovenAt: number | null;
  consecutiveMisses: number;
  tangled: boolean;
}

export interface ReviewEvent {
  id?: number;
  itemId: ItemId;
  at: number;
  exercise: ExerciseType;
  rating: Rating;
  implicit: boolean;
  weight: number; // 1 for explicit reviews, < 1 for implicit credit
}

export interface Scarf {
  id: string;
  name: string;
  tagFilter: string[];
  tartanId: string;
  createdAt: number;
  pausedAt: number | null;
  wovenOrder: ItemId[];
}

export type MothSize = 'small' | 'medium' | 'large';

export interface MothHole {
  itemId: ItemId;
  size: MothSize;
}
