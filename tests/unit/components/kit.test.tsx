// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef, useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccentKeys } from '../../../src/ui/components/AccentKeys';
import { Button } from '../../../src/ui/components/Button';
import { Chip } from '../../../src/ui/components/Chip';
import { MothSprite } from '../../../src/ui/components/MothSprite';
import { ProgressBar } from '../../../src/ui/components/ProgressBar';
import { RatingBar } from '../../../src/ui/components/RatingBar';
import { TagPicker } from '../../../src/ui/components/TagPicker';

afterEach(cleanup);

describe('Button', () => {
  it('fires onClick', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Weave</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Weave' }));
    expect(fn).toHaveBeenCalled();
  });
  it('renders a link when given `to`', () => {
    render(<MemoryRouter><Button to="/new" variant="ghost">Start a new scarf</Button></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Start a new scarf' })).toHaveAttribute('href', '/new');
  });
});

describe('Chip', () => {
  it('shows its text', () => {
    render(<Chip variant="calm">resting</Chip>);
    expect(screen.getByText('resting')).toBeInTheDocument();
  });
});

describe('TagPicker', () => {
  it('toggles tags and reports pressed state', () => {
    const onToggle = vi.fn();
    render(<TagPicker tags={['topic:love', 'topic:food']} selected={['topic:love']} onToggle={onToggle} label="Tags" />);
    expect(screen.getByRole('button', { name: 'topic:love' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'topic:food' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'topic:food' }));
    expect(onToggle).toHaveBeenCalledWith('topic:food');
  });
  it('is non-interactive without onToggle', () => {
    render(<TagPicker tags={['a']} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ProgressBar', () => {
  it('exposes progressbar values', () => {
    render(<ProgressBar value={3} max={10} label="Session" />);
    const bar = screen.getByRole('progressbar', { name: 'Session' });
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
  });
});

describe('RatingBar', () => {
  it('pre-selects Good with the interval hint', () => {
    render(<RatingBar interval="4 days" onRate={() => {}} />);
    expect(screen.getByRole('button', { name: /Good/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4 days')).toBeInTheDocument();
    expect(screen.getByText('sooner')).toBeInTheDocument();
    expect(screen.getByText('later')).toBeInTheDocument();
  });
  it('pre-selects Hard after an accent slip and reports a rating', () => {
    const onRate = vi.fn();
    render(<RatingBar interval="1 day" pre="hard" onRate={onRate} />);
    expect(screen.getByRole('button', { name: /Hard/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Easy/ }));
    expect(onRate).toHaveBeenCalledWith('easy');
  });
});

describe('AccentKeys', () => {
  function Harness() {
    const ref = createRef<HTMLInputElement>();
    const [v, setV] = useState('');
    return (
      <>
        <input aria-label="answer" ref={ref} value={v} onChange={(e) => setV(e.target.value)} />
        <AccentKeys inputRef={ref} />
      </>
    );
  }
  it('inserts the accent at the cursor and keeps focus', () => {
    render(<Harness />);
    const input = screen.getByLabelText('answer') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'cal' } });
    input.setSelectionRange(2, 2);
    fireEvent.click(screen.getByRole('button', { name: 'Insert à' }));
    expect(input.value).toBe('caàl');
    expect(document.activeElement).toBe(input);
  });
  it('has five keys', () => {
    render(<Harness />);
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });
});

describe('MothSprite', () => {
  it('renders at the given size', () => {
    render(<MothSprite size={22} rotate={0.5} />);
    expect(screen.getByRole('img', { name: 'Moth' })).toHaveAttribute('width', '22');
  });
});
