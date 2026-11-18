// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startScarf } from '../../../src/app/services';
import { createSessionStore } from '../../../src/app/store/sessionStore';
import { getProgress, getScarf, putScarf } from '../../../src/db/repo';
import { LoomScreen } from '../../../src/ui/screens/Loom/LoomScreen';
import { harness, SCARF_TAGS, T0, type Harness } from '../services/helpers';

const fakeCtx = new Proxy(
  { createPattern: () => 'pattern', putImageData: () => undefined },
  { get: (t: Record<string, unknown>, k: string) => t[k] ?? (() => undefined), set: () => true },
);
let h: Harness;

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;
  vi.stubGlobal('ImageData', class { constructor(public data: unknown, public width: number, public height: number) {} });
});
afterEach(async () => {
  cleanup();
  await h?.database.delete();
});

async function open(path: string, tags = SCARF_TAGS) {
  h = harness();
  const store = createSessionStore(() => h.deps);
  const scarf = await startScarf(h.deps, { name: 'Love', tagFilter: tags, tartanId: 'none' });
  render(
    <MemoryRouter initialEntries={[path.replace(':id', scarf.id)]}>
      <Routes>
        <Route path="/loom" element={<LoomScreen store={store} database={h.database} items={h.deps.items} now={() => T0} />} />
        <Route path="/loom/:scarfId" element={<LoomScreen store={store} database={h.database} items={h.deps.items} now={() => T0} />} />
      </Routes>
    </MemoryRouter>,
  );
  return { store, scarf };
}

describe('LoomScreen', () => {
  it('offers the shelf to choose from when no scarf is given', async () => {
    h = harness();
    await putScarf({ id: 's1', name: 'Love', tagFilter: [], tartanId: 'x', createdAt: 1, pausedAt: null, wovenOrder: [] }, h.database);
    render(
      <MemoryRouter initialEntries={['/loom']}>
        <Routes>
          <Route path="/loom" element={<LoomScreen database={h.database} items={h.deps.items} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Choose a scarf to weave')).toBeTruthy();
    expect((await screen.findByRole('link', { name: 'Love' })).getAttribute('href')).toBe('/loom/s1');
  });

  it('introduces a new word first, with its meaning and no quiz', async () => {
    const { store } = await open('/loom/:id');
    expect(await screen.findByText('A new word')).toBeTruthy();
    const word = store.getState().itemId!;
    expect(screen.getByText(h.deps.items.get(word)!.en)).toBeTruthy();
    expect(screen.queryByText(/Choose the meaning|Type the Gaelic/)).toBeNull();
    for (const name of ['Got it', 'Later', 'I already know this']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('"Got it" goes on to check the same word', async () => {
    const { store } = await open('/loom/:id');
    await screen.findByText('A new word');
    const word = store.getState().itemId;
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(await screen.findByText(/Choose the meaning/)).toBeTruthy();
    expect(store.getState().itemId).toBe(word);
  });

  it('"I already know this" counts the word as known and moves on without a quiz', async () => {
    const { store } = await open('/loom/:id');
    await screen.findByText('A new word');
    const word = store.getState().itemId;
    fireEvent.click(screen.getByRole('button', { name: 'I already know this' }));
    await waitFor(() => expect(store.getState().itemId).not.toBe(word));
    expect((await getProgress(word!, h.database))?.wovenAt).not.toBeNull();
    expect((await getScarf(store.getState().scarfId!, h.database))?.wovenOrder).not.toContain(word);
  });

  it('"Later" puts the word off without a quiz', async () => {
    const { store } = await open('/loom/:id');
    await screen.findByText('A new word');
    const word = store.getState().itemId;
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    await waitFor(() => expect(store.getState().itemId).not.toBe(word));
    expect(await getProgress(word!, h.database)).toBeUndefined();
  });

  it('shows the first exercise with its label, top line and progress', async () => {
    await open('/loom/:id');
    await screen.findByText('A new word');
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(await screen.findByText(/Love · new item 1 of /)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Session progress' })).toBeTruthy();
    expect(screen.getByText(/Choose the meaning|Type the Gaelic/)).toBeTruthy();
  });

  it('gives gentle feedback on a miss and moves on with Next', async () => {
    const { store } = await open('/loom/:id');
    await screen.findByText('A new word');
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    await screen.findByText(/Choose the meaning|Type the Gaelic/);
    const ex = store.getState().exercise!;
    if (ex.type === 'recognise') {
      const wrong = ex.options.find((o) => !o.correct)!;
      fireEvent.click(screen.getByRole('button', { name: wrong.text }));
    } else {
      fireEvent.change(screen.getByLabelText('Your answer in Gaelic'), { target: { value: 'zzz' } });
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    }
    expect(await screen.findByText(/Not quite\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.queryByText(/Not quite\./)).toBeNull());
  });

  it('offers "I already knew this" after the first correct answer to a new sentence, and moves on', async () => {
    const { store } = await open('/loom/:id');
    await screen.findByText('A new word');
    while (store.getState().card?.exercise === 'introduce') {
      const word = store.getState().itemId;
      fireEvent.click(screen.getByRole('button', { name: 'I already know this' }));
      await waitFor(() => expect(store.getState().itemId).not.toBe(word));
    }
    const sentence = store.getState().itemId!;
    expect(sentence.startsWith('sent:')).toBe(true);
    expect(screen.queryByRole('button', { name: 'I already knew this' })).toBeNull();

    const ex = store.getState().exercise!;
    if (ex.type === 'produce') {
      fireEvent.change(screen.getByLabelText('Your answer in Gaelic'), { target: { value: ex.answer } });
      fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    } else {
      fireEvent.click(screen.getByRole('button', { name: ex.options.find((o) => o.correct)!.text }));
    }
    await screen.findByText(/Well done/);
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I already knew this' }));
    await waitFor(() => expect(store.getState().itemId).not.toBe(sentence));
    expect((await getProgress(sentence, h.database))?.fsrs).toBeNull();
    expect(screen.queryByRole('button', { name: 'I already knew this' })).toBeNull();
  });

  it('weaves an item in, with a caption, after it has been learned', async () => {
    const { store } = await open('/loom/:id');
    for (let guard = 0; guard < 40 && !store.getState().weaving; guard++) {
      await screen.findByText(/A new word|Choose the meaning|Fill the gap|Type the Gaelic/);
      if (store.getState().card?.exercise === 'introduce') {
        fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
        await waitFor(() => expect(store.getState().card?.exercise).not.toBe('introduce'));
      }
      await screen.findByText(/Choose the meaning|Fill the gap|Type the Gaelic/);
      const ex = store.getState().exercise;
      if (!ex) break;
      if (ex.type === 'produce') {
        fireEvent.change(screen.getByLabelText('Your answer in Gaelic'), { target: { value: ex.answer } });
        fireEvent.click(screen.getByRole('button', { name: 'Check' }));
      } else {
        const right = ex.options.find((o) => o.correct)!;
        fireEvent.click(screen.getByRole('button', { name: right.text }));
      }
      await screen.findByText(/Math dhèanta!/);
      if (store.getState().weaving) break;
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await waitFor(() => expect(screen.queryByText(/Math dhèanta!/)).toBeNull());
    }
    expect(await screen.findByText(/^Woven into Love: \+0\.0\d ell$/)).toBeTruthy();
  });

  it.each([
    ['finished a batch', { done: true }],
    ['waiting on a missed thread', { waitUntil: T0 + 600_000 }],
  ])('lets the learner learn more words after %s', async (_name, state) => {
    const { store } = await open('/loom/:id');
    await screen.findByText(/new item 1 of/);
    store.setState({ card: null, itemId: null, exercise: null, ...state });
    fireEvent.click(await screen.findByRole('button', { name: 'Learn more words' }));
    expect(await screen.findByText(/new item 1 of/)).toBeTruthy();
  });

  it('tells the learner when there is nothing to weave', async () => {
    await open('/loom/:id', ['topic:nothing']);
    expect(await screen.findByText(/woven every word on this scarf/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Learn more words' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to the shelf' }).getAttribute('href')).toBe('/');
  });
});
