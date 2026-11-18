import type { LearnableItem, Progress, Scarf, Tartan, Topic } from '../../../domain/types';
import { matchesFilter } from '../../../domain/unlock';

/** Tags a learner can pick, split by the namespace rules in content/README.md. */
export function collectTags(items: readonly LearnableItem[]): { topic: string[]; grammar: string[] } {
  const all = new Set(items.flatMap((i) => i.tags));
  const sorted = [...all].sort();
  return {
    topic: sorted.filter((t) => t.startsWith('topic:')),
    grammar: sorted.filter((t) => t.startsWith('prep:') || t.startsWith('grammar:')),
  };
}

/** Counts the items the scarf would cover, and how many another scarf already owns. */
export function previewCounts(
  items: readonly LearnableItem[],
  tagFilter: readonly string[],
  progress: readonly Progress[],
): { fresh: number; elsewhere: number } {
  if (tagFilter.length === 0) return { fresh: 0, elsewhere: 0 };
  const owned = new Set(progress.filter((p) => p.ownerScarfId !== null).map((p) => p.itemId));
  let fresh = 0;
  let elsewhere = 0;
  for (const item of items) {
    if (!matchesFilter(item, tagFilter)) continue;
    if (owned.has(item.id)) elsewhere += 1;
    else fresh += 1;
  }
  return { fresh, elsewhere };
}

export function isTopicSelected(topic: Topic, selected: readonly string[]): boolean {
  return topic.tags.length > 0 && topic.tags.every((t) => selected.includes(t));
}

/** Tapping a starter selects all its tags, or clears them when it is already selected. */
export function toggleTopic(topic: Topic, selected: readonly string[]): string[] {
  if (isTopicSelected(topic, selected)) return selected.filter((t) => !topic.tags.includes(t));
  return [...new Set([...selected, ...topic.tags])];
}

/** The starter's name, or the names of the topics whose tags are all selected, joined with " and ". */
export function defaultScarfName(topics: readonly Topic[], selected: readonly string[]): string {
  const names = topics.filter((t) => isTopicSelected(t, selected)).map((t) => t.name);
  return names.join(' and ');
}

export function filterTartans(tartans: readonly Tartan[], query: string): Tartan[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...tartans];
  return tartans.filter((t) => [t.name, t.clan, t.variant ?? ''].some((f) => f.toLowerCase().includes(q)));
}

export function buildScarf(args: {
  id: string;
  name: string;
  tagFilter: string[];
  tartanId: string;
  now: number;
}): Scarf {
  return {
    id: args.id,
    name: args.name,
    tagFilter: args.tagFilter,
    tartanId: args.tartanId,
    createdAt: args.now,
    pausedAt: null,
    wovenOrder: [],
  };
}
