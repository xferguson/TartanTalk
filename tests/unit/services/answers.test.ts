import { describe, expect, it } from 'vitest';
import { capRating, checkExercise, defaultRating } from '../../../src/app/services';
import type { Exercise } from '../../../src/domain/exercises';

const produce: Exercise = { type: 'produce', itemId: 'lex:gaol', prompt: 'love', answer: 'gaol', altAnswers: [] };
const choice: Exercise = {
  type: 'recognise',
  itemId: 'lex:gaol',
  prompt: 'gaol',
  options: [
    { text: 'hate', correct: false },
    { text: 'love', correct: true },
  ],
};

describe('checkExercise', () => {
  it('marks a chosen option', () => {
    expect(checkExercise(choice, 'love')).toMatchObject({ correct: true, verdict: 'correct' });
    expect(checkExercise(choice, 'hate')).toMatchObject({ correct: false, matched: 'love' });
  });

  it('accepts typed Gaelic and treats an accent slip as near', () => {
    expect(checkExercise(produce, 'gaol').correct).toBe(true);
    const near = checkExercise({ ...produce, answer: 'Gàidhlig' }, 'Gaidhlig');
    expect(near).toMatchObject({ verdict: 'near', correct: true, maxRating: 'hard' });
  });
});

describe('ratings', () => {
  it('defaults to Again, Hard after a slip, otherwise Good', () => {
    expect(defaultRating(checkExercise(choice, 'hate'))).toBe('again');
    expect(defaultRating(checkExercise({ ...produce, answer: 'Gàidhlig' }, 'Gaidhlig'))).toBe('hard');
    expect(defaultRating(checkExercise(choice, 'love'))).toBe('good');
  });

  it('never lets an accent slip rate above Hard', () => {
    const slip = checkExercise({ ...produce, answer: 'Gàidhlig' }, 'Gaidhlig');
    expect(capRating('easy', slip)).toBe('hard');
    expect(capRating('good', slip)).toBe('hard');
    expect(capRating('easy', checkExercise(choice, 'love'))).toBe('easy');
    expect(capRating('good', checkExercise(choice, 'hate'))).toBe('again');
  });
});
