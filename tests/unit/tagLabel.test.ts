import { describe, expect, it } from 'vitest';
import { tagLabel } from '../../src/domain/tagLabel';

describe('tagLabel', () => {
  it.each([
    ['topic:love', 'Love'],
    ['topic:hills-glens-lochs', 'Hills glens lochs'],
    ['prep:aig', 'aig (at)'],
    ['prep:zzz', 'zzz'],
    ['grammar:possession-with-aig', 'Possession with aig'],
    ['grammar:pronominal-preposition', 'Pronominal preposition'],
  ])('%s reads as %s', (tag, label) => expect(tagLabel(tag)).toBe(label));
});
