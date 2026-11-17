// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TartanDB } from '../../../src/db/db';
import { listScarves } from '../../../src/db/repo';
import type { ContentBundle } from '../../../src/content';
import { NewScarfScreen } from '../../../src/ui/screens/NewScarf/NewScarfScreen';

// jsdom has no canvas; swatches skip drawing when there is no context.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

let database: TartanDB | undefined;
let n = 0;
afterEach(async () => {
  cleanup();
  await database?.delete();
});

const bundle = (tartanCount: number): ContentBundle => ({
  lexemes: [
    { kind: 'lexeme', id: 'lex:gaol', gd: 'gaol', en: 'love', pos: 'noun', tags: ['topic:love'], source: { ref: 't', licence: 'CC BY-SA 4.0' }, review: 'unreviewed' },
    { kind: 'lexeme', id: 'lex:aig', gd: 'aig', en: 'at', pos: 'preposition', tags: ['prep:aig'], source: { ref: 't', licence: 'CC BY-SA 4.0' }, review: 'unreviewed' },
  ],
  forms: [],
  sentences: [],
  topics: [{ id: 'love', name: 'Love and feelings', tags: ['topic:love'], starter: true }],
  tartans: Array.from({ length: tartanCount }, (_, i) => ({
    id: `t${i}`, name: `Tartan ${i}`, clan: i === 0 ? 'Ferguson' : 'Other', sett: 'B/4 R4',
    colours: { B: '#000000', R: '#ff0000' }, provenance: { ref: 't' }, verified: false,
  })),
});

function setup(tartanCount = 10, path = '/new') {
  database = new TartanDB(`w2e-${n++}`);
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/new" element={<NewScarfScreen content={bundle(tartanCount)} database={database} now={() => 99} newId={() => 'abc'} />} />
        <Route path="/loom/:id" element={<p>loom abc</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewScarfScreen', () => {
  it('disables create until a tag and a tartan are chosen', () => {
    setup();
    const go = screen.getByRole('button', { name: 'Set up the loom' });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Love and feelings' }));
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tartan 0' }));
    expect(go).toBeEnabled();
  });

  it('shows a live preview', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Love and feelings' }));
    expect(screen.getByText('new items').parentElement).toHaveTextContent('1 new items');
    expect(screen.getByText(/0 already woven elsewhere/)).toBeInTheDocument();
  });

  it('pages tartans and filters them by search', () => {
    setup(12);
    expect(screen.getAllByRole('button', { name: /^Tartan \d+$/ })).toHaveLength(9);
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getAllByRole('button', { name: /^Tartan \d+$/ })).toHaveLength(12);
    fireEvent.change(screen.getByLabelText('Search tartans'), { target: { value: 'ferguson' } });
    expect(screen.getAllByRole('button', { name: /^Tartan \d+$/ })).toHaveLength(1);
  });

  it('explains when there are no tartans', () => {
    setup(0);
    expect(screen.getByText(/No tartans are in the library yet/)).toBeInTheDocument();
  });

  it('creates the scarf and goes to the loom', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Love and feelings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tartan 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up the loom' }));
    await waitFor(() => expect(screen.getByText('loom abc')).toBeInTheDocument());
    expect(await listScarves(database)).toEqual([
      { id: 'abc', name: 'Love and feelings', tagFilter: ['topic:love'], tartanId: 't0', createdAt: 99, pausedAt: null, wovenOrder: [] },
    ]);
  });

  it('starts with the tartan named in the query string chosen, even past the first page', () => {
    setup(12, '/new?tartan=t11');
    expect(screen.getByRole('button', { name: 'Tartan 11' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores an unknown tartan in the query string', () => {
    setup(10, '/new?tartan=nope');
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });
});
