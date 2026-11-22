// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Feedback } from '../../../src/app/store/sessionStore';
import type { ProduceExercise } from '../../../src/domain/exercises';
import { ExercisePanel } from '../../../src/ui/screens/Reweave/ExercisePanel';

afterEach(cleanup);

const exercise: ProduceExercise = { type: 'produce', itemId: 's1', prompt: 'I love you', answer: 'tha gaol agam ort', altAnswers: [] };
// Only the fields the panel reads; the real check carries more.
const missed = { check: { matched: 'tha gaol agam ort' }, suggestedRating: 'hard', awaitingRating: true } as unknown as Feedback;

describe('typed answers', () => {
  it('start empty when the same item comes round again after a miss', () => {
    const noop = () => undefined;
    const { rerender } = render(<ExercisePanel exercise={exercise} feedback={null} onSubmit={noop} />);
    fireEvent.change(screen.getByLabelText('Your answer in Gaelic'), { target: { value: 'wrong try' } });
    rerender(<ExercisePanel exercise={exercise} feedback={missed} onSubmit={noop} />);
    rerender(<ExercisePanel exercise={{ ...exercise }} feedback={null} onSubmit={noop} />);
    expect((screen.getByLabelText('Your answer in Gaelic') as HTMLInputElement).value).toBe('');
  });
});
