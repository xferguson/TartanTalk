// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TartanDB } from '../../../src/db/db';
import { putProgress, putScarf } from '../../../src/db/repo';
import { ShelfScreen } from '../../../src/ui/screens/Shelf/ShelfScreen';

const DAY = 86_400_000;
const fakeCtx = new Proxy(
  { createPattern: () => 'pattern', putImageData: () => undefined },
  { get: (t: Record<string, unknown>, k: string) => t[k] ?? (() => undefined), set: () => true },
);
let database: TartanDB;

beforeEach(() => {
  database = new TartanDB(`shelf-test-${Math.random()}`);
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;
  vi.stubGlobal('ImageData', class { constructor(public data: unknown, public width: number, public height: number) {} });
});
afterEach(async () => {
  cleanup();
  await database.delete();
});

const view = (hour = 9) =>
  render(
    <MemoryRouter>
      <ShelfScreen database={database} now={() => new Date(2026, 0, 1, hour).getTime()} />
    </MemoryRouter>,
  );

describe('ShelfScreen', () => {
  it('shows the empty state with a way to start', async () => {
    view();
    expect(await screen.findByText(/Your shelf is empty/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start a new scarf' }).getAttribute('href')).toBe('/new');
  });

  it('lists a scarf with its length, a moth chip and a Reweave action', async () => {
    const t = new Date(2026, 0, 1, 15).getTime();
    await putScarf({ id: 's1', name: 'Love', tagFilter: ['prep:aig'], tartanId: 'x', createdAt: t - 50 * DAY, pausedAt: null, wovenOrder: ['lex:a'] }, database);
    await putProgress({
      itemId: 'lex:a', phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 3, ownerScarfId: 's1', wovenAt: t - 40 * DAY,
      consecutiveMisses: 0, tangled: false, fsrs: { stability: 1, difficulty: 5, lastReview: t - 11 * DAY, due: t - 10 * DAY, reps: 1, lapses: 0 },
    }, database);
    render(
      <MemoryRouter>
        <ShelfScreen database={database} now={() => t} />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Feasgar math!')).toBeTruthy();
    expect(await screen.findByText(/1 scarf has visitors\./)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Love' }).getAttribute('href')).toBe('/scarf/s1');
    expect(screen.getByText('1 moth hole')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Reweave 1 hole' }).getAttribute('href')).toBe('/reweave/s1');
    expect(screen.getByText(/Your shelf · 0.02 ells woven/i)).toBeTruthy();
  });
});
