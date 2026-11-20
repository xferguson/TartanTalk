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

const strip = (order: string[], holes: ScarfCanvasHole[] = [], extra = {}) => (
  <ScarfCanvas tartan={tartan} variant="strip" wovenOrder={order} holes={holes} name="Love" lengthLabel="2 ells" onReweave={() => undefined} {...extra} />
);
const STRIP_LABEL = 'Love cloth. Drag sideways, or use the left and right arrow keys, to move along the scarf.';

// jsdom has no PointerEvent; a mouse event carries the clientX the drag reads.
class FakePointerEvent extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}) {
    super(type, { bubbles: true, cancelable: true, ...init });
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'touch';
  }
}
const pointer = (el: Element, type: string, clientX: number) => {
  act(() => {
    el.dispatchEvent(new FakePointerEvent(type, { clientX }));
  });
};

describe('ScarfCanvas strip on a long scarf', () => {
  it('shows its newest end, with a quiet marker for older holes', () => {
    const { container } = render(strip(ids(60), [hole('i0'), hole('i59')]));
    expect(screen.getByRole('group', { name: STRIP_LABEL }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('button', { name: 'Reweave gd-i59' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reweave gd-i0' })).toBeNull();
    const marker = container.querySelector('[data-edge="older"]');
    expect(marker?.getAttribute('aria-hidden')).toBe('true');
    expect(marker?.textContent).toContain('1');
    expect(container.querySelector('[data-edge="newer"]')).toBeNull();
  });

  it('offers nothing to drag while the cloth fits', () => {
    const { container } = render(strip(ids(10), [hole('i0')]));
    expect(screen.queryByRole('group')).toBeNull();
    expect(container.querySelector('[data-edge]')).toBeNull();
  });

  it('moves along the cloth with the arrow keys, Home and End', () => {
    const { container } = render(strip(ids(60), [hole('i0'), hole('i59')]));
    const scarf = screen.getByRole('group');
    fireEvent.keyDown(scarf, { key: 'ArrowRight' }); // already at the newest end: stays put
    expect(screen.getByRole('button', { name: 'Reweave gd-i59' })).toBeTruthy();
    fireEvent.keyDown(scarf, { key: 'ArrowLeft' });
    expect(screen.queryByRole('button', { name: 'Reweave gd-i59' })).toBeNull();
    expect(container.querySelector('[data-edge="newer"]')?.textContent).toContain('1');
    fireEvent.keyDown(scarf, { key: 'Home' }); // the left end of the screen is the oldest cloth
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
    expect(container.querySelector('[data-edge="older"]')).toBeNull();
    fireEvent.keyDown(scarf, { key: 'End' });
    expect(screen.getByRole('button', { name: 'Reweave gd-i59' })).toBeTruthy();
    expect(container.querySelector('[data-edge="newer"]')).toBeNull();
  });

  it('follows a sideways drag, so dragging right brings older cloth into view', () => {
    render(strip(ids(60), [hole('i0'), hole('i59')]));
    const scarf = screen.getByRole('group');
    pointer(scarf, 'pointerdown', 100);
    pointer(scarf, 'pointermove', 400);
    pointer(scarf, 'pointerup', 400);
    expect(screen.queryByRole('button', { name: 'Reweave gd-i59' })).toBeNull();
    pointer(scarf, 'pointerdown', 400);
    pointer(scarf, 'pointermove', 100);
    pointer(scarf, 'pointerup', 100);
    expect(screen.getByRole('button', { name: 'Reweave gd-i59' })).toBeTruthy();
  });

  it('lets a tap reach a hole but swallows the click that ends a drag', () => {
    const onReweave = vi.fn();
    render(strip(ids(60), [hole('i59')], { onReweave }));
    const scarf = screen.getByRole('group');
    const button = screen.getByRole('button', { name: 'Reweave gd-i59' });
    pointer(scarf, 'pointerdown', 100);
    pointer(scarf, 'pointerup', 100);
    fireEvent.click(button);
    expect(onReweave).toHaveBeenCalledTimes(1);
    pointer(scarf, 'pointerdown', 100);
    pointer(scarf, 'pointermove', 60); // 40px the wrong way: clamped at the newest end, but still a drag
    pointer(scarf, 'pointerup', 60);
    fireEvent.click(button);
    expect(onReweave).toHaveBeenCalledTimes(1);
  });

  it('moves only for a sideways wheel, leaving the page to scroll otherwise', () => {
    render(strip(ids(60), [hole('i59')]));
    const scarf = screen.getByRole('group');
    expect(fireEvent.wheel(scarf, { deltaY: 100 })).toBe(true); // not prevented: the page scrolls
    expect(screen.getByRole('button', { name: 'Reweave gd-i59' })).toBeTruthy();
    expect(fireEvent.wheel(scarf, { deltaX: 40, deltaY: 0 })).toBe(true); // newest end: nothing further that way
    expect(fireEvent.wheel(scarf, { deltaX: -400, deltaY: 0 })).toBe(false);
    expect(screen.queryByRole('button', { name: 'Reweave gd-i59' })).toBeNull();
  });

  it('leaves the view where it was when a band is woven while looking at older cloth', () => {
    const { rerender } = render(strip(ids(60), [hole('i0')]));
    fireEvent.keyDown(screen.getByRole('group'), { key: 'Home' });
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
    act(() => rerender(strip(ids(61), [hole('i0')])));
    expect(screen.getByRole('button', { name: 'Reweave gd-i0' })).toBeTruthy();
  });
});
