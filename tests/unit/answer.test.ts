import { describe, expect, it } from 'vitest';
import { checkAnswer, normalise } from '../../src/domain/answer';

describe('normalise', () => {
  it('applies NFC, folds case, collapses space and strips edge punctuation', () => {
    expect(normalise('  Tha  mi toilichte! ')).toBe('tha mi toilichte');
    // decomposed à equals precomposed à
    expect(normalise('à')).toBe(normalise('à'));
  });
  it('unifies apostrophe variants and keeps in-word apostrophes and hyphens', () => {
    expect(normalise('m’ athair')).toBe("m' athair");
    expect(normalise("mʼ athair")).toBe("m' athair");
    expect(normalise('h-uile')).toBe('h-uile');
  });
});

describe('checkAnswer', () => {
  it('accepts an exact answer', () => {
    expect(checkAnswer('Tha gaol agam ort.', 'tha gaol agam ort')).toMatchObject({
      verdict: 'correct',
      wrongTokens: [],
    });
  });

  it('accepts altGd alternatives and reports which matched', () => {
    const r = checkAnswer('Tha mi sgìth', 'tha mi sgith', ['Tha mi sgìth.', 'Tha mi claoidhte']);
    expect(r.verdict).toBe('near');
    const alt = checkAnswer('Tha mi sgìth', 'Tha mi claoidhte', ['Tha mi claoidhte']);
    expect(alt).toMatchObject({ verdict: 'correct', matched: 'Tha mi claoidhte' });
  });

  it('treats a missing or wrong accent as near: correct, capped at hard, with a nudge', () => {
    const r = checkAnswer('gaol', 'gaol');
    expect(r.verdict).toBe('correct');
    const n = checkAnswer('sgìth', 'sgith');
    expect(n).toMatchObject({ verdict: 'near', maxRating: 'hard', wrongTokens: [] });
    expect(n.nudge).toContain('sgìth');
    expect(checkAnswer('sgìth', 'sgíth').verdict).toBe('near');
  });

  it('returns which token was wrong', () => {
    const r = checkAnswer('Tha gaol agam ort', 'Tha gaol agad ort');
    expect(r.verdict).toBe('wrong');
    expect(r.wrongTokens).toEqual([2]);
  });

  it('flags missing tokens', () => {
    expect(checkAnswer('tha mi sgìth', 'tha mi').wrongTokens).toEqual([2]);
  });

  it('picks the closest candidate for wrong-token reporting', () => {
    const r = checkAnswer('a b c', 'x y c', ['x y z']);
    expect(r.matched).toBe('x y z');
    expect(r.wrongTokens).toEqual([2]);
  });

  it('treats an empty answer as wrong', () => {
    expect(checkAnswer('gaol', '   ').verdict).toBe('wrong');
  });

  it('is not fooled by apostrophe style', () => {
    expect(checkAnswer("m' athair", 'm’ athair').verdict).toBe('correct');
  });
});
