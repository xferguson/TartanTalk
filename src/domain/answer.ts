/**
 * Answer checking for typed Gaelic. Pure: no DOM, no clock.
 * Exact (after normalisation) is correct; a match that differs only in accents
 * is "near": correct, but capped at Hard with a gentle nudge (PRD: accents).
 */

export type AnswerVerdict = 'correct' | 'near' | 'wrong';

export interface AnswerResult {
  verdict: AnswerVerdict;
  /** The accepted form the answer was compared with (primary or an altGd). */
  matched: string;
  /** Highest rating the learner may give; only set for near matches. */
  maxRating?: 'hard';
  /** Gentle correction shown for near matches. */
  nudge?: string;
  /** Indices into the matched form's tokens that were wrong or missing. */
  wrongTokens: number[];
}

const APOSTROPHES = /[’‘ʼ`´]/g;
// Edge punctuation only: in-word apostrophes and hyphens (m' athair, h-uile) are meaningful.
const EDGE_PUNCT = /^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu;
const INNER_PUNCT = /[.,!?;:"“”„…()]/gu;

export function normalise(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(INNER_PUNCT, ' ')
    .replace(/[‐-―]/g, '-')
    .split(/\s+/)
    .map((t) => t.replace(EDGE_PUNCT, ''))
    .filter(Boolean)
    .join(' ');
}

/** Strips accents so à/á/a compare equal. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

const tokens = (s: string): string[] => (s ? s.split(' ') : []);

/** Expected-token indices left unmatched by a longest-common-subsequence alignment. */
function wrongIndices(expected: string[], given: string[]): number[] {
  const e = expected.map(fold);
  const g = given.map(fold);
  const dp = Array.from({ length: e.length + 1 }, () => new Array<number>(g.length + 1).fill(0));
  for (let i = e.length - 1; i >= 0; i--) {
    for (let j = g.length - 1; j >= 0; j--) {
      dp[i][j] = e[i] === g[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const wrong: number[] = [];
  let i = 0;
  let j = 0;
  while (i < e.length) {
    if (j < g.length && e[i] === g[j]) {
      i++;
      j++;
    } else if (j < g.length && dp[i][j + 1] >= dp[i + 1][j]) {
      j++; // extra word typed; not an expected token
    } else {
      wrong.push(i++);
    }
  }
  return wrong;
}

export function checkAnswer(target: string, answer: string, altGd: string[] = []): AnswerResult {
  const given = normalise(answer);
  const candidates = [target, ...altGd].map((raw) => ({ raw, norm: normalise(raw) }));

  const exact = candidates.find((c) => c.norm === given);
  if (given && exact) return { verdict: 'correct', matched: exact.raw, wrongTokens: [] };

  const foldedGiven = fold(given);
  const near = candidates.find((c) => fold(c.norm) === foldedGiven);
  if (given && near) {
    return {
      verdict: 'near',
      matched: near.raw,
      maxRating: 'hard',
      nudge: `Nearly: mind the accents. It's “${near.raw}”.`,
      wrongTokens: [],
    };
  }

  const givenTokens = tokens(given);
  // Report against the closest accepted form so the learner sees the fewest wrong tokens.
  const scored = candidates.map((c) => ({ raw: c.raw, wrong: wrongIndices(tokens(c.norm), givenTokens) }));
  const best = scored.reduce((a, b) => (b.wrong.length < a.wrong.length ? b : a));
  return { verdict: 'wrong', matched: best.raw, wrongTokens: best.wrong };
}
