// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScarfCanvas, type ScarfCanvasHole } from '../../../src/ui/components/ScarfCanvas';
import type { Tartan } from '../../../src/domain/types';

const tartan: Tartan = {
  id: 'ferguson-old',
  name: 'Ferguson (Old)',
  clan: 'Ferguson',
  sett: 'B/6 R2 G/6',
  colours: { B: '#2c4084', R: '#c4202f', G: '#0b5a3a' },
  scale: 0.5,
  provenance: { ref: 'test' },
  verified: false,
};

const fakeCtx = new Proxy(
  { createPattern: () => 'pattern', putImageData: () => undefined },
  { get: (t: Record<string, unknown>, k: string) => t[k] ?? (() => undefined), set: () => true },
);

const ids = (n: number) => Array.from({ length: n }, (_, i) => `i${i}`);
const hole = (itemId: string): ScarfCanvasHole => ({ itemId, size: 'medium', gd: `gd-${itemId}` });

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;
  vi.stubGlobal('ImageData', class { constructor(public data: unknown, public width: number, public height: number) {} });
  // Reduced motion makes every move instant, so the tests see the end state straight away.
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }));
});

const detail = (order: string[], holes: ScarfCanvasHole[] = [], extra = {}) => (
  <ScarfCanvas tartan={tartan} variant="detail" wovenOrder={order} holes={holes} name="Love" lengthLabel="4 ells" onReweave={() => undefined} {...extra} />
);

describe('ScarfCanvas on a long scarf', () => {
  it('offers nothing to drag while the cloth fits', () => {
    const { container } = render(detail(ids(40), [hole('i0')]));
    expect(screen.queryByRole('group')).toBeNull();
    expect(container.querySelector('[data-edge]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
  });

  it('opens at the newest end, with a cue that more cloth lies further along', () => {
    const { container } = render(detail(ids(100)));
    const scarf = screen.getByRole('group', { name: 'Love cloth. Drag, or use the arrow keys, to move along the scarf.' });
    expect(scarf.getAttribute('tabindex')).toBe('0');
    expect(scarf.getAttribute('aria-roledescription')).toBe('scarf');
    expect(container.querySelector('[data-edge="older"]')).toBeTruthy();
    expect(container.querySelector('[data-edge="newer"]')).toBeNull();
  });

  it('shows a moth marker for holes beyond the window instead of drawing them', () => {
    render(detail(ids(100), [hole('i0'), hole('i1'), hole('i99')]));
    expect(screen.getByRole('button', { name: 'Reweave gd-i99' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reweave gd-i0' })).toBeNull();
    expect(screen.getByRole('button', { name: '2 moth holes further along the scarf. Show them.' })).toBeTruthy();
  });

  it('moves along the scarf with Home, End and the arrow keys', () => {
    render(detail(ids(100), [hole('i0'), hole('i99')]));
    const scarf = screen.getByRole('group');
    fireEvent.keyDown(scarf, { key: 'End' });
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reweave gd-i99' })).toBeNull();
    expect(screen.getByRole('button', { name: '1 moth hole back towards the newest weaving. Show them.' })).toBeTruthy();
    fireEvent.keyDown(scarf, { key: 'Home' });
    expect(screen.getByRole('button', { name: 'Reweave gd-i99' })).toBeTruthy();
    fireEvent.keyDown(scarf, { key: 'ArrowUp' }); // already at the newest end: stays put
    expect(screen.getByRole('button', { name: 'Reweave gd-i99' })).toBeTruthy();
    for (let i = 0; i < 2; i++) fireEvent.keyDown(scarf, { key: 'ArrowDown' });
    expect(screen.queryByRole('button', { name: 'Reweave gd-i99' })).toBeNull(); // 54px along, the top band has gone
  });

  it('brings the nearest hidden hole into view when its marker is tapped, and focuses it', () => {
    render(detail(ids(100), [hole('i0'), hole('i40')]));
    fireEvent.click(screen.getByRole('button', { name: '2 moth holes further along the scarf. Show them.' }));
    const shown = screen.getByRole('button', { name: 'Reweave gd-i40' });
    expect(document.activeElement).toBe(shown);
  });

  it('keeps the newest band in view as it grows at the newest end', () => {
    const { rerender } = render(detail(ids(100), [hole('i100')]));
    rerender(detail(ids(101), [hole('i100')]));
    expect(screen.getByRole('button', { name: 'Reweave gd-i100' })).toBeTruthy();
  });

  it('leaves the view where it was when a band is woven while looking at older cloth', () => {
    const { rerender } = render(detail(ids(100), [hole('i0')]));
    fireEvent.keyDown(screen.getByRole('group'), { key: 'End' });
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
    act(() => rerender(detail(ids(101), [hole('i0')])));
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
  });

  it('draws the ruler from the item lengths', () => {
    render(detail(ids(100), [], { itemElls: ids(100).map(() => 0.04) }));
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3.5')).toBeTruthy();
  });
});

describe('ScarfCanvas strip on a long scarf', () => {
  it('shows its newest end, with a quiet marker for older holes', () => {
    const { container } = render(
      <ScarfCanvas tartan={tartan} variant="strip" wovenOrder={ids(60)} holes={[hole('i0'), hole('i59')]} name="Love" lengthLabel="2 ells" />,
    );
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reweave gd-i59' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reweave gd-i0' })).toBeNull();
    const marker = container.querySelector('[data-edge="older"]');
    expect(marker?.getAttribute('aria-hidden')).toBe('true');
    expect(marker?.textContent).toContain('1');
  });
});
