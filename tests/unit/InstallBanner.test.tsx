// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InstallBanner } from '../../src/ui/components/InstallBanner';

afterEach(cleanup);

describe('InstallBanner', () => {
  it('renders nothing when there is no mode', () => {
    const { container } = render(<InstallBanner mode={null} install={vi.fn()} dismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers a one-tap Install and a Not now in native mode', () => {
    const install = vi.fn().mockResolvedValue(undefined);
    const dismiss = vi.fn();
    render(<InstallBanner mode="native" install={install} dismiss={dismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Install' }));
    expect(install).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(dismiss).toHaveBeenCalled();
  });

  it('shows Add to Home Screen steps, with no Install button, on iOS', () => {
    render(<InstallBanner mode="ios" install={vi.fn()} dismiss={vi.fn()} />);
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Install Tartan Talk' })).toBeInTheDocument();
  });
});
