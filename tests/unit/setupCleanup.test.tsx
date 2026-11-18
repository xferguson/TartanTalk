// @vitest-environment jsdom
// No afterEach(cleanup) here on purpose: tests/setup.ts must clear the page between tests.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('shared test setup', () => {
  it('renders a button', () => {
    render(<button type="button">Weave</button>);
    expect(screen.getByRole('button', { name: 'Weave' })).toBeInTheDocument();
  });

  it('starts the next test with an empty page', () => {
    expect(screen.queryByRole('button', { name: 'Weave' })).not.toBeInTheDocument();
  });
});
