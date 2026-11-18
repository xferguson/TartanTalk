/** Short English glosses for the prepositions, so a learner meets "aig (at)" rather than "prep:aig". */
const PREP_GLOSS: Record<string, string> = {
  aig: 'at',
  air: 'on',
  ann: 'in',
  as: 'out of',
  bho: 'from',
  de: 'of, off',
  do: 'to',
  le: 'with',
  mu: 'about',
  ri: 'to, against',
};

const sentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A human-friendly name for a content tag. Content keeps machine tags
 * (`topic:love`, `prep:aig`); learners never see the namespace prefix.
 */
export function tagLabel(tag: string): string {
  const i = tag.indexOf(':');
  if (i < 0) return sentenceCase(tag.replace(/-/g, ' '));
  const kind = tag.slice(0, i);
  const value = tag.slice(i + 1);
  if (kind === 'prep') {
    const gloss = PREP_GLOSS[value];
    return gloss ? `${value} (${gloss})` : value;
  }
  if (kind === 'grammar' && value.startsWith('possession-with-')) {
    return `Possession with ${value.slice('possession-with-'.length)}`;
  }
  return sentenceCase(value.replace(/-/g, ' '));
}
