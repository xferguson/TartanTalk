import { formatLength } from '../domain/length';

/** Placeholder scarf shelf until the design mock-ups pick a direction. */
export function Shelf() {
  return (
    <main className="shelf">
      <h1>Tartan Talk</h1>
      <p className="greeting">
        <span lang="gd">Madainn mhath!</span> <span className="en">(Good morning!)</span>
      </p>
      <p>Your scarf shelf is empty. The loom is being set up.</p>
      <p className="muted">Woven so far: {formatLength(0)}</p>
    </main>
  );
}
