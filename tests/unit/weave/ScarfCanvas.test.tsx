// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScarfCanvas } from '../../../src/ui/components/ScarfCanvas';
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

afterEach(cleanup);

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;
  vi.stubGlobal('ImageData', class { constructor(public data: unknown, public width: number, public height: number) {} });
});

describe('ScarfCanvas', () => {
  it('describes the scarf as a text alternative', () => {
    render(<ScarfCanvas tartan={tartan} variant="strip" wovenOrder={['a']} name="Love" lengthLabel="2.4 ells" holes={[{ itemId: 'a', size: 'small', gd: 'gaol' }]} />);
    expect(screen.getByRole('img', { name: 'Love, 2.4 ells, 1 moth hole' })).toBeTruthy();
  });

  it('renders each hole as a button that reweaves its item', () => {
    const onReweave = vi.fn();
    render(
      <ScarfCanvas
        tartan={tartan}
        variant="detail"
        wovenOrder={['a', 'b']}
        name="Love"
        lengthLabel="1 ell"
        holes={[{ itemId: 'b', size: 'large', gd: 'gaol' }]}
        onReweave={onReweave}
      />,
    );
    const button = screen.getByRole('button', { name: 'Reweave gaol' });
    expect(button.querySelector('[lang="gd"]')?.textContent).toBe('gaol');
    fireEvent.click(button);
    expect(onReweave).toHaveBeenCalledWith('b');
  });

  it('renders no buttons when there are no holes', () => {
    render(<ScarfCanvas tartan={tartan} variant="strip" wovenOrder={[]} name="New" lengthLabel="0 ells" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('skips the shuttle sweep under reduced motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const { rerender } = render(<ScarfCanvas tartan={tartan} variant="strip" wovenOrder={['a']} name="L" lengthLabel="1 ell" />);
    rerender(<ScarfCanvas tartan={tartan} variant="strip" wovenOrder={['a', 'b']} name="L" lengthLabel="1 ell" />);
    expect(raf).not.toHaveBeenCalled();
  });

  it('runs the shuttle sweep when a band is woven', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
    const { rerender } = render(<ScarfCanvas tartan={tartan} variant="strip" wovenOrder={['a']} name="L" lengthLabel="1 ell" />);
    expect(raf).not.toHaveBeenCalled();
    rerender(<ScarfCanvas tartan={tartan} variant="strip" wovenOrder={['a', 'b']} name="L" lengthLabel="1 ell" />);
    expect(raf).toHaveBeenCalled();
  });
});
