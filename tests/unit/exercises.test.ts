import { describe, expect, it } from 'vitest';
import { MAX_OPTIONS, buildCloze, buildProduce, buildRecognise, seededRng } from '../../src/domain/exercises';
import { ALL_ITEMS, agad, agam, aige, gaol, iLoveYou, orm } from './fixtures/slice';

describe('buildRecognise', () => {
  it('has exactly one correct option, the English meaning', () => {
    const ex = buildRecognise(agam, ALL_ITEMS, seededRng(1));
    expect(ex.prompt).toBe('agam');
    const correct = ex.options.filter((o) => o.correct);
    expect(correct).toEqual([{ text: 'at me', correct: true }]);
  });

  it('prefers other persons of the same preposition as distractors', () => {
    const ex = buildRecognise(agam, ALL_ITEMS, seededRng(2));
    const texts = ex.options.map((o) => o.text);
    expect(ex.options).toHaveLength(MAX_OPTIONS);
    expect(texts).toContain(agad.en);
    expect(texts).toContain(aige.en);
  });

  it('only draws distractors from known items of the same kind, without duplicates', () => {
    const ex = buildRecognise(gaol, [gaol, agam, agad], seededRng(3));
    expect(ex.options).toEqual([{ text: 'love', correct: true }]);
    const ex2 = buildRecognise(agam, [agam, agad, { ...agad, id: 'form:dup' }], seededRng(3));
    expect(ex2.options.map((o) => o.text).sort()).toEqual(['at me', 'at you']);
  });

  it('is deterministic for a seed', () => {
    expect(buildRecognise(agam, ALL_ITEMS, seededRng(9))).toEqual(buildRecognise(agam, ALL_ITEMS, seededRng(9)));
  });
});

describe('buildCloze', () => {
  it('blanks the requested token and offers Gaelic options', () => {
    const ex = buildCloze(iLoveYou, ALL_ITEMS, seededRng(1), 'form:aig.1sg');
    if (!ex) throw new Error('expected a cloze');
    expect(ex.answer).toBe('agam');
    expect(ex.tokens).toEqual(['Tha', 'gaol', null, 'ort']);
    expect(ex.blankIndex).toBe(2);
    expect(ex.options.filter((o) => o.correct)).toEqual([{ text: 'agam', correct: true }]);
    expect(ex.options.map((o) => o.text)).toContain('agad');
    expect(ex.translation).toBe('I love you.');
  });

  it('chooses a tracked token when no target is given', () => {
    const ex = buildCloze(iLoveYou, ALL_ITEMS, seededRng(4));
    expect(ex).not.toBeNull();
    expect(iLoveYou.tokens[ex?.blankIndex ?? -1].itemId).not.toBeNull();
  });

  it('returns null if the target is not in the sentence', () => {
    expect(buildCloze(iLoveYou, ALL_ITEMS, seededRng(1), orm.id)).toBeNull();
  });

  it('ignores untracked tokens and keeps trailing punctuation out of the answer', () => {
    const s = { ...iLoveYou, tokens: [{ text: 'Seo', itemId: null }, { text: 'agam.', itemId: 'form:aig.1sg' }] };
    expect(buildCloze(s, ALL_ITEMS, seededRng(1))?.answer).toBe('agam');
    expect(buildCloze({ ...s, tokens: [s.tokens[0]] }, ALL_ITEMS, seededRng(1))).toBeNull();
  });
});

describe('buildProduce', () => {
  it('prompts with the English and accepts the Gaelic and its alternatives', () => {
    expect(buildProduce(agam)).toEqual({ type: 'produce', itemId: agam.id, prompt: 'at me', answer: 'agam', altAnswers: [] });
    expect(buildProduce({ ...iLoveYou, altGd: ['Tha gaol agam ort-sa.'] }).altAnswers).toEqual(['Tha gaol agam ort-sa.']);
  });
});
