import type { ItemId, LearnableItem, Progress, Topic } from './types';
import { isLearned, matchesFilter } from './unlock';

export interface TopicSuggestion {
  topic: Topic;
  /** Items in the topic the learner has not yet woven. */
  fresh: number;
}

/**
 * Starter topics a scarf could take on next: not already covered by its tags,
 * with something still to learn. The one with the most to learn comes first.
 */
export function recommendTopics(
  topics: readonly Topic[],
  items: readonly LearnableItem[],
  tagFilter: readonly string[],
  progress: ReadonlyMap<ItemId, Progress>,
): TopicSuggestion[] {
  return topics
    .filter((t) => t.starter && t.tags.length > 0 && !t.tags.every((tag) => tagFilter.includes(tag)))
    .map((topic) => ({
      topic,
      fresh: items.filter((i) => matchesFilter(i, topic.tags) && !isLearned(progress.get(i.id))).length,
    }))
    .filter((s) => s.fresh > 0)
    .sort((a, b) => b.fresh - a.fresh || a.topic.name.localeCompare(b.topic.name));
}
