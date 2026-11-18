import { describe, expect, it } from 'vitest';
import { creditNote, exerciseLabel, slippedLetter, topLine, weavingCaption } from '../../../src/ui/screens/Loom/loomModel';
import { ALL_ITEMS } from '../fixtures/slice';

const items = new Map(ALL_ITEMS.map((i) => [i.id, i]));

describe('loomModel', () => {
  it('words the top line for learning and for tangles, never past the total', () => {
    expect(topLine('Love', 'learn', 0, 5)).toBe('Love · new item 1 of 5');
    expect(topLine('Love', 'tangles', 2, 5)).toBe('Love · review 3 of 5');
    expect(topLine('Love', 'learn', 5, 5)).toBe('Love · new item 5 of 5');
  });
  it('labels each exercise type', () => {
    expect(exerciseLabel('recognise')).toBe('Choose the meaning');
    expect(exerciseLabel('cloze')).toBe('Fill the gap');
    expect(exerciseLabel('produce')).toBe('Type the Gaelic');
  });
  it('finds the letter an accent slip missed', () => {
    expect(slippedLetter('Gàidhlig', 'Gaidhlig')).toBe('a');
    expect(slippedLetter('bò', 'bo')).toBe('o');
    expect(slippedLetter('Gàidhlig', 'Gaid')).toBeNull();
  });
  it('captions a weaving in ells', () => {
    expect(weavingCaption('Love', 0.04)).toBe('Woven into Love: +0.04 ell');
  });
  it('lists the credited Gaelic words, once each, without the sentence itself', () => {
    const credited = ['lex:tha', 'form:aig.1sg', 'lex:tha', 'sent:love-001'];
    expect(creditNote(credited, items, 'sent:love-001')).toBe('Typing the full sentence also counts as a review for tha, agam.');
    expect(creditNote([], items, null)).toBeNull();
  });
});
