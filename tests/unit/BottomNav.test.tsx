// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { BottomNav } from '../../src/ui/components/BottomNav';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('BottomNav', () => {
  it('marks the current room as active', () => {
    renderAt('/library');
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Shelf' })).not.toHaveAttribute('aria-current');
  });

  it('gives every room its own decorative icon', () => {
    renderAt('/');
    const labels = ['Shelf', 'Loom', 'Tangles', 'Library', 'Settings'];
    const icons = labels.map((label) => {
      const svg = screen.getByRole('link', { name: label }).querySelector('svg');
      expect(svg, `${label} has an icon`).not.toBeNull();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('focusable', 'false');
      return svg?.getAttribute('data-icon');
    });
    expect(icons).toEqual(['shelf', 'loom', 'tangles', 'library', 'settings']);
  });
});
