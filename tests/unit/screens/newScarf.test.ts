import { describe, expect, it } from 'vitest';
import {
  buildScarf,
  collectTags,
  defaultScarfName,
  filterTartans,
  isTopicSelected,
  previewCounts,
  toggleTopic,
} from '../../../src/ui/screens/NewScarf/newScarf';
import type { Lexeme, Progress, Tartan, Topic } from '../../../src/domain/types';

const lex = (id: string, tags: string[]): Lexeme => ({
  kind: 'lexeme', id, gd: id, en: id, pos: 'noun', tags,
  source: { ref: 't', licence: 'CC BY-SA 4.0' }, review: 'unreviewed',
});
const owned = (itemId: string): Progress => ({
  itemId, phase: 'learning', correctInSession: 0, ladderStep: 0, seededStep: 0, fsrs: null,
  ownerScarfId: 's1', wovenAt: null, consecutiveMisses: 0, tangled: false,
});
const love: Topic = { id: 'love', name: 'Love and feelings', tags: ['topic:love', 'topic:feelings'], starter: true };
const tartan = (id: string, name: string, clan: string, variant?: string): Tartan => ({
  id, name, clan, variant, sett: 'B/4 R4', colours: { B: '#000000', R: '#ff0000' },
  provenance: { ref: 't' }, verified: false,
});

describe('collectTags', () => {
  it('splits topic from grammar tags and ignores the rest', () => {
    const t = collectTags([lex('a', ['topic:love', 'prep:aig', 'pos:noun']), lex('b', ['grammar:tense', 'topic:love'])]);
    expect(t.topic).toEqual(['topic:love']);
    expect(t.grammar).toEqual(['grammar:tense', 'prep:aig']);
  });
});

describe('previewCounts', () => {
  const items = [lex('a', ['topic:love']), lex('b', ['topic:love']), lex('c', ['topic:food'])];
  it('is zero with no tags chosen', () => {
    expect(previewCounts(items, [], [])).toEqual({ fresh: 0, elsewhere: 0 });
  });
  it('separates new items from those another scarf owns', () => {
    expect(previewCounts(items, ['topic:love'], [owned('a')])).toEqual({ fresh: 1, elsewhere: 1 });
  });
  it('does not count progress rows with no owner as woven', () => {
    expect(previewCounts(items, ['topic:love'], [{ ...owned('a'), ownerScarfId: null }])).toEqual({ fresh: 2, elsewhere: 0 });
  });
});

describe('starter topics', () => {
  it('selects all its tags, then clears them', () => {
    const on = toggleTopic(love, ['topic:x']);
    expect(on).toEqual(['topic:x', 'topic:love', 'topic:feelings']);
    expect(isTopicSelected(love, on)).toBe(true);
    expect(toggleTopic(love, on)).toEqual(['topic:x']);
  });
  it('names the scarf after the chosen topics', () => {
    const food: Topic = { id: 'f', name: 'Food', tags: ['topic:food'] };
    expect(defaultScarfName([love, food], [...love.tags, 'topic:food'])).toBe('Love and feelings and Food');
    expect(defaultScarfName([love], ['topic:love'])).toBe('');
  });
});

describe('filterTartans', () => {
  const all = [tartan('1', 'Ferguson (Old)', 'Ferguson', 'Old'), tartan('2', 'Murchison', 'Murchison')];
  it('matches name, clan and variant, ignoring case', () => {
    expect(filterTartans(all, 'FERG')).toHaveLength(1);
    expect(filterTartans(all, 'old')).toHaveLength(1);
    expect(filterTartans(all, '')).toHaveLength(2);
  });
});

describe('buildScarf', () => {
  it('starts empty and unpaused', () => {
    expect(buildScarf({ id: 'x', name: 'N', tagFilter: ['topic:love'], tartanId: 't', now: 5 })).toEqual({
      id: 'x', name: 'N', tagFilter: ['topic:love'], tartanId: 't', createdAt: 5, pausedAt: null, wovenOrder: [],
    });
  });
});
