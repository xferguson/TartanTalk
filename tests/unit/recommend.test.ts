import { describe, expect, it } from 'vitest';
import { recommendTopics } from '../../src/domain/recommend';
import type { LearnableItem, Progress, Topic } from '../../src/domain/types';

const item = (id: string, tag: string) => ({ id, tags: [tag], kind: 'lexeme' }) as unknown as LearnableItem;
const topic = (id: string, tag: string, starter = true): Topic => ({ id, name: id, tags: [tag], starter });

describe('recommendTopics', () => {
  const items = [item('a', 'topic:x'), item('b', 'topic:y'), item('c', 'topic:y'), item('d', 'topic:z')];
  const topics = [topic('x', 'topic:x'), topic('y', 'topic:y'), topic('z', 'topic:z'), topic('w', 'topic:w')];

  it('skips covered topics and empty ones, most to learn first', () => {
    const out = recommendTopics(topics, items, ['topic:x'], new Map());
    expect(out.map((s) => [s.topic.id, s.fresh])).toEqual([['y', 2], ['z', 1]]);
  });

  it('does not count woven items', () => {
    const woven = new Map([['d', { itemId: 'd', wovenAt: 1 } as unknown as Progress]]);
    expect(recommendTopics(topics, items, ['topic:x'], woven).map((s) => s.topic.id)).toEqual(['y']);
  });
});
