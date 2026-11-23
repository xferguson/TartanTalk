// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDevClock } from '../../../src/app/clock';
import { createSessionStore } from '../../../src/app/store/sessionStore';
import { TartanDB } from '../../../src/db/db';
import { putProgress, putScarf } from '../../../src/db/repo';
import { seededRng } from '../../../src/domain/exercises';
import type { Progress, Scarf } from '../../../src/domain/types';
import { TanglesScreen } from '../../../src/ui/screens/Tangles/TanglesScreen';
import { ALL_ITEMS } from '../fixtures/slice';

vi.mock('../../../src/content', async () => {
  const f = await import('../fixtures/slice');
  return {
    loadContent: () => ({ lexemes: [], forms: [], sentences: [], topics: [], tartans: [] }),
    indexItems: () => new Map(f.ALL_ITEMS.map((i) => [i.id, i])),
  };
});

const now = new Date('2026-03-10T12:00:00Z').getTime();
let database: TartanDB;
let n = 0;

const scarf: Scarf = {
  id: 's1', name: 'Love and feelings', tagFilter: [], tartanId: 'x', createdAt: now, pausedAt: null, wovenOrder: ['lex:gaol'],
};
const tangled = (itemId: string): Progress => ({
  itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 0, ownerScarfId: 's1', wovenAt: 0,
  consecutiveMisses: 2, tangled: true,
  fsrs: { stability: 1, difficulty: 5, lastReview: now - 1000, due: now - 500, reps: 1, lapses: 2 },
});

function renderScreen() {
  const clock = createDevClock(() => now);
  const store = createSessionStore(() => ({
    db: database, clock, items: new Map(ALL_ITEMS.map((i) => [i.id, i])), rng: seededRng(3),
  }));
  render(
    <MemoryRouter>
      <TanglesScreen store={store} database={database} />
    </MemoryRouter>,
  );
}

afterEach(async () => {
  cleanup();
  await database.delete();
});
beforeEach(async () => {
  database = new TartanDB(`tangles-${n++}`);
  await putScarf(scarf, database);
});

describe('TanglesScreen', () => {
  it('shows the empty state', async () => {
    renderScreen();
    expect(await screen.findByText('No tangles. Every thread is running smoothly.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Untangle/ })).toBeNull();
  });

  it('lists tangled items with their scarf and offers to untangle them', async () => {
    await putProgress(tangled('lex:gaol'), database);
    await putProgress(tangled('form:aig.1sg'), database);
    renderScreen();
    expect(await screen.findByText('gaol')).toBeTruthy();
    expect(screen.getByText('at me')).toBeTruthy();
    expect(screen.getAllByText('Love and feelings')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Untangle 2' })).toBeTruthy();
  });

  it('starts a ladder session when asked (one item has nothing to choose between, so it is typed)', async () => {
    await putProgress(tangled('lex:gaol'), database);
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: 'Untangle 1' }));
    expect(await screen.findByText('Type the Gaelic')).toBeTruthy();
  });
});
