// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentBundle } from '../../../src/content';
import { LibraryScreen } from '../../../src/ui/screens/Library/LibraryScreen';

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(cleanup);

const tartan = (id: string, name: string, clan: string, verified: boolean, url?: string) => ({
  id, name, clan, variant: 'Modern', sett: 'B/4 R4', colours: { B: '#000080', R: '#ff0000' },
  provenance: { ref: `ref ${id}`, notes: `notes ${id}`, ...(url ? { url } : {}) }, verified,
});
const bundle: ContentBundle = {
  lexemes: [], forms: [], sentences: [], topics: [],
  tartans: [tartan('a', 'Ferguson', 'Ferguson', false), tartan('b', 'Murchison', 'Murchison', true, 'https://example.org/b')],
};

function Where() {
  const l = useLocation();
  return <p>at {l.pathname}{l.search}</p>;
}
function setup(content = bundle) {
  render(
    <MemoryRouter initialEntries={['/library']}>
      <Routes>
        <Route path="/library" element={<LibraryScreen content={content} />} />
        <Route path="/new" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LibraryScreen', () => {
  it('shows the count and a card per tartan, flagging unverified ones', () => {
    setup();
    expect(screen.getByText('2 setts')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Modern/ })).toHaveLength(2);
    expect(screen.getAllByText('pattern unverified')).toHaveLength(1);
  });

  it('filters by search and says when nothing matches', () => {
    setup();
    const box = screen.getByLabelText('Search tartans');
    fireEvent.change(box, { target: { value: 'murch' } });
    expect(screen.getAllByRole('button', { name: /Modern/ })).toHaveLength(1);
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText('No tartans match “zzz”.')).toBeTruthy();
  });

  it('has an empty state for an empty library', () => {
    setup({ ...bundle, tartans: [] });
    expect(screen.getByText('No tartans are in the library yet.')).toBeTruthy();
  });

  it('opens a detail view with colour key, provenance and notes, and goes back', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Murchison/ }));
    expect(screen.getByRole('heading', { name: 'Murchison (Modern)' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Colour key' }).children).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'ref b' }).getAttribute('href')).toBe('https://example.org/b');
    expect(screen.getByText('notes b')).toBeTruthy();
    expect(screen.queryByText('pattern unverified')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the library' }));
    expect(screen.getByText('2 setts')).toBeTruthy();
  });

  it('shows the unverified note in detail and sends the tartan to the new scarf screen', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Ferguson/ }));
    expect(screen.getByText('pattern unverified')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use for a new scarf' }));
    expect(screen.getByText('at /new?tartan=a')).toBeTruthy();
  });
});
