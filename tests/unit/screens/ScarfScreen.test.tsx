// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScarfScreen } from '../../../src/ui/screens/Scarf/ScarfScreen';
import { db } from '../../../src/db/db';
import { putProgress, putScarf } from '../../../src/db/repo';
import type { Progress, Scarf } from '../../../src/domain/types';

vi.mock('../../../src/content', async () => {
  const f = await import('../fixtures/slice');
  return {
    loadContent: () => ({
      lexemes: [f.gaol], forms: [f.agam], sentences: [f.iLoveYou],
      topics: [],
      tartans: [{ id: 'ferguson-old', name: 'Ferguson (Old)', clan: 'Ferguson', sett: 'B/6 R2', colours: { B: '#2c4084', R: '#c4202f' }, provenance: { ref: 't' }, verified: false }],
    }),
    indexItems: (b: { lexemes: { id: string }[]; forms: { id: string }[]; sentences: { id: string }[] }) =>
      new Map([...b.lexemes, ...b.forms, ...b.sentences].map((i) => [i.id, i])),
  };
});
vi.mock('../../../src/ui/components/ScarfCanvas', () => ({
  ScarfCanvas: ({ holes, onReweave }: { holes?: { itemId: string; gd: string }[]; onReweave?: (id: string) => void }) => (
    <div>{holes?.map((h) => <button key={h.itemId} onClick={() => onReweave?.(h.itemId)}>Reweave {h.gd}</button>)}</div>
  ),
}));

const DAY = 86_400_000;
const now = new Date('2026-03-10T12:00:00Z').getTime();
const scarf: Scarf = {
  id: 's1', name: 'Love and feelings', tagFilter: ['topic:love'], tartanId: 'ferguson-old',
  createdAt: new Date('2026-03-02T09:00:00Z').getTime(), pausedAt: null,
  wovenOrder: ['lex:gaol', 'form:aig.1sg', 'sent:love-001'],
};
const overdue = (itemId: string): Progress => ({
  itemId, phase: 'review', correctInSession: 0, ladderStep: 0, seededStep: 0, ownerScarfId: 's1', wovenAt: 0,
  consecutiveMisses: 0, tangled: false,
  fsrs: { stability: 1, difficulty: 5, lastReview: now - 2 * DAY, due: now - DAY, reps: 1, lapses: 0 },
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/scarf/:id" element={<ScarfScreen now={() => now} />} />
        <Route path="/reweave/:scarfId" element={<p>reweave page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);
beforeEach(async () => {
  await db.scarves.clear();
  await db.progress.clear();
  await putScarf(scarf);
});

describe('ScarfScreen', () => {
  it('shows the title, subtitle and facts', async () => {
    renderAt('/scarf/s1');
    expect(await screen.findByRole('heading', { name: 'Love and feelings' })).toBeTruthy();
    expect(screen.getByText('Ferguson (Old) · begun 2 Mar')).toBeTruthy();
    expect(screen.getByText('items: 1 words, 1 forms, 1 sentences')).toBeTruthy();
    expect(screen.getByText('moth holes waiting')).toBeTruthy();
    expect(screen.getByText('Love')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Weave' }).getAttribute('href')).toBe('/loom/s1');
  });

  it('offers Reweave only when there are holes, and a hole links to its item', async () => {
    await putProgress(overdue('lex:gaol'));
    renderAt('/scarf/s1');
    const link = await screen.findByRole('link', { name: 'Reweave 1' });
    expect(link.getAttribute('href')).toBe('/reweave/s1');
    screen.getByRole('button', { name: 'Reweave gaol' }).click();
    await waitFor(() => expect(screen.getByText('reweave page')).toBeTruthy());
  });

  it('has no Reweave action when nothing is overdue', async () => {
    renderAt('/scarf/s1');
    await screen.findByRole('heading', { name: 'Love and feelings' });
    expect(screen.queryByRole('link', { name: /^Reweave/ })).toBeNull();
  });

  it('says so when the scarf is not on the shelf', async () => {
    renderAt('/scarf/nope');
    expect(await screen.findByText(/isn't on the shelf/)).toBeTruthy();
  });
});
