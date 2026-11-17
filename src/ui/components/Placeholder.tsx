import type { ReactNode } from 'react';

/** Temporary body for screens that later tasks will build out. */
export function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h1>{title}</h1>
      <p style={{ color: 'var(--muted)', margin: 0 }}>{children ?? 'The loom is being set up for this room.'}</p>
    </>
  );
}
