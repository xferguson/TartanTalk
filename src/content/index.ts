import type { ContentBundle } from './build';
import type { LearnableItem } from '../domain/types';

export type { ContentBundle } from './build';

/**
 * Loader for the bundle written by `npm run content`. The JSON is committed so the
 * app builds without a content step; CI re-runs the script and fails if it is stale.
 */
const files = import.meta.glob<unknown[]>('./generated/*.json', { eager: true, import: 'default' });

function table<T>(name: string): T[] {
  return (files[`./generated/${name}.json`] as T[] | undefined) ?? [];
}

export function loadContent(): ContentBundle {
  return {
    lexemes: table('lexemes'),
    forms: table('forms'),
    sentences: table('sentences'),
    tartans: table('tartans'),
    topics: table('topics'),
  };
}

/** Every learnable item keyed by id, for resolving sentence tokens and progress rows. */
export function indexItems(bundle: ContentBundle): Map<string, LearnableItem> {
  return new Map<string, LearnableItem>(
    [...bundle.lexemes, ...bundle.forms, ...bundle.sentences].map((i) => [i.id, i]),
  );
}
