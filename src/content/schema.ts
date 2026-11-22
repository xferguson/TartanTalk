import { z } from 'zod';
import type { Form, Lexeme, Sentence, Tartan, Topic } from '../domain/types';

/**
 * Schemas for the YAML in `content/` (shape in docs/WORKPLAN.md, Appendix A).
 * Each is `.strict()` so a mistyped key fails loudly instead of being dropped.
 * The `kind` field is absent from YAML: it comes from the folder, see build.ts.
 */

export const TAG_NAMESPACES = ['topic', 'prep', 'grammar', 'pos', 'level'] as const;

const nonEmpty = z.string().trim().min(1);

const source = z
  .object({ ref: nonEmpty, licence: nonEmpty, url: z.string().url().optional() })
  .strict();

const review = z.enum(['sourced', 'generated', 'unreviewed', 'verified', 'flagged']);
const tags = z.array(nonEmpty);

const pos = z.enum([
  'noun', 'verb', 'adjective', 'adverb', 'preposition', 'pronoun',
  'article', 'conjunction', 'particle', 'numeral', 'other',
]);
const person = z.enum(['1sg', '2sg', '3sg-m', '3sg-f', '1pl', '2pl', '3pl']);

type Raw<T extends { kind: string }> = Omit<T, 'kind'>;

export const lexemeSchema = z
  .object({
    id: z.string().regex(/^lex:\S+$/, 'id must start with "lex:"'),
    gd: nonEmpty,
    en: nonEmpty,
    pos,
    gender: z.enum(['m', 'f']).optional(),
    freqRank: z.number().int().positive().optional(),
    tags,
    audio: z.string().optional(),
    source,
    review,
  })
  .strict() satisfies z.ZodType<Raw<Lexeme>>;

export const formSchema = z
  .object({
    id: z.string().regex(/^form:\S+$/, 'id must start with "form:"'),
    lexemeId: z.string().regex(/^lex:\S+$/, 'lexemeId must start with "lex:"'),
    gd: nonEmpty,
    en: nonEmpty,
    person: person.optional(),
    tags,
    audio: z.string().optional(),
    source,
    review,
  })
  .strict() satisfies z.ZodType<Raw<Form>>;

export const sentenceSchema = z
  .object({
    id: z.string().regex(/^sent:\S+$/, 'id must start with "sent:"'),
    gd: nonEmpty,
    en: nonEmpty,
    altGd: z.array(nonEmpty),
    tokens: z
      .array(z.object({ text: nonEmpty, itemId: z.string().nullable() }).strict())
      .min(1),
    pattern: nonEmpty,
    tags,
    isIdiom: z.boolean().optional(),
    audio: z.string().optional(),
    source,
    review,
  })
  .strict() satisfies z.ZodType<Raw<Sentence>>;

export const tartanSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id must be lowercase letters, digits and hyphens'),
    name: nonEmpty,
    clan: nonEmpty,
    variant: z.string().optional(),
    sett: nonEmpty,
    colours: z.record(z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colour must be #rrggbb')),
    scale: z.number().positive().optional(),
    provenance: z.object({ ref: nonEmpty, url: z.string().url().optional(), notes: z.string().optional() }).strict(),
    verified: z.boolean(),
  })
  .strict() satisfies z.ZodType<Tartan>;

export const topicSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: nonEmpty,
    tags: z.array(nonEmpty).min(1),
    starter: z.boolean().optional(),
  })
  .strict() satisfies z.ZodType<Topic>;
