// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDevClock } from '../../../src/app/clock';
import { createSessionStore } from '../../../src/app/store/sessionStore';
import { TartanDB } from '../../../src/db/db';
import { putProgress, putScarf } from '../../../src/db/repo';
import { seededRng } from '../../../src/domain/exercises';
import type { Progress, Scarf } from '../../../src/domain/types';
import { ReweaveScreen, formatInterval } from '../../../src/ui/screens/Reweave/ReweaveScreen';
import { ALL_ITEMS } from '../fixtures/slice';

vi.mock('../../../src/content', () => ({
  loadContent: () => ({ lexemes: [], forms: [], sentences: [], topics: [], tartans: [] }),
  indexItems: () => new Map(),
}));

const DAY = 86_400_000;
const now = new Date('2026-03-10T12:00:00Z').getTime();
let database: TartanDB;
let n = 0;

const scarf: Scarf = {
  id: 's1', name: 'Love and feelings', tagFilter: ['topic:love'], tartanId: 'x',
  createdAt: now - 9 * DAY, pausedAt: null, wovenOrder: ['lex:gaol', 'form:aig.1sg'],
};
const row = (itemId: string, extra: Partial<Progress> = {}): Progress => ({
  itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 0, ownerScarfId: 's1', wovenAt: 0,
  consecutiveMisses: 0, tangled: false,
  fsrs: { stability: 1, difficulty: 5, lastReview: now - 2 * DAY, due: now - DAY, reps: 1, lapses: 0 },
  ...extra,
});

function renderScreen() {
  const clock = createDevClock(() => now);
  const store = createSessionStore(() => ({
    db: database, clock, items: new Map(ALL_ITEMS.map((i) => [i.id, i])), rng: seededRng(3),
  }));
  render(
    <MemoryRouter initialEntries={['/reweave/s1']}>
      <Routes>
        <Route path="/reweave/:scarfId" element={<ReweaveScreen store={store} database={database} now={() => now} />} />
        <Route path="/" element={<p>the shelf</p>} />
        <Route path="/tangles" element={<p>tangles page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Answers whatever question is showing, correctly. */
async function answerCorrectly() {
  const input = await screen.findByLabelText('Your answer in Gaelic').catch(() => null);
  if (input) {
    const answer = ALL_ITEMS.find((i) => i.en === (document.querySelector('p[class*="prompt"]')?.textContent ?? ''))?.gd ?? '';
    fireEvent.change(input, { target: { value: answer } });
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    return;
  }
  const gold = ALL_ITEMS.map((i) => i.en);
  const opts = screen.getAllByRole('button').filter((b) => gold.includes(b.textContent ?? ''));
  const prompt = document.querySelector('p[class*="prompt"]')?.textContent;
  const right = ALL_ITEMS.find((i) => i.gd === prompt)?.en;
  fireEvent.click(opts.find((b) => b.textContent === right) ?? opts[0]);
}

afterEach(async () => {
  cleanup();
  await database.delete();
});
beforeEach(async () => {
  database = new TartanDB(`reweave-${n++}`);
  await putScarf(scarf, database);
});

describe('formatInterval', () => {
  it('speaks in whole days', () => {
    expect(formatInterval(0.2)).toBe('soon');
    expect(formatInterval(1)).toBe('1 day');
    expect(formatInterval(3.6)).toBe('4 days');
  });
});

describe('ReweaveScreen', () => {
  it('says so when nothing is waiting', async () => {
    renderScreen();
    expect(await screen.findByText('Nothing to reweave. Every thread is holding.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to the shelf' }).getAttribute('href')).toBe('/');
  });

  it('mends a thread: question, rating, status, and the way back to the shelf', async () => {
    await putProgress(row('lex:gaol'), database);
    renderScreen();
    expect(await screen.findByText(/Reweaving · Love and feelings · 1 of 1/)).toBeTruthy();
    await answerCorrectly();
    expect(await screen.findByText('How did that feel?', { selector: 'p' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Good/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(await screen.findByText(/All mended\. The scarf is whole again\./)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to the shelf' })).toBeTruthy();
  });

  it('counts holes left and offers the next thread', async () => {
    await putProgress(row('lex:gaol'), database);
    await putProgress(row('form:aig.1sg', { fsrs: { stability: 1, difficulty: 5, lastReview: now - 3 * DAY, due: now - 2 * DAY, reps: 1, lapses: 0 } }), database);
    renderScreen();
    await screen.findByText(/1 of 2/);
    await answerCorrectly();
    fireEvent.click(await screen.findByRole('button', { name: /Good/ }));
    expect(await screen.findByText(/Math dhèanta! Well done\. 1 hole left\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next thread' }));
    expect(await screen.findByText(/2 of 2/)).toBeTruthy();
  });

  it('points to Tangles when tangled items are waiting', async () => {
    await putProgress(row('lex:gaol', { tangled: true, consecutiveMisses: 2 }), database);
    renderScreen();
    expect(await screen.findByRole('link', { name: 'Untangle' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Untangle' }).getAttribute('href')).toBe('/tangles'));
  });
});
