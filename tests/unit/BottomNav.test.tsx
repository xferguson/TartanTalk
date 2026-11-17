// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BottomNav } from '../../src/ui/components/BottomNav';

describe('BottomNav', () => {
  it('marks the current room as active', () => {
    render(
      <MemoryRouter initialEntries={['/library']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Shelf' })).not.toHaveAttribute('aria-current');
  });
});
