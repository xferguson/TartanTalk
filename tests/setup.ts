// Adds DOM matchers (toBeInTheDocument, ...) for component tests running under jsdom.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest globals are off, so Testing Library never registers its own auto-cleanup.
// Clear rendered components after every test so no file has to remember to (L12).
afterEach(cleanup);
