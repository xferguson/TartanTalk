import { parse } from 'yaml';
import type { z } from 'zod';
import type { Form, Lexeme, Sentence, Tartan, Topic } from '../domain/types';
import { parseSett } from '../weave/sett';
import {
  TAG_NAMESPACES,
  formSchema,
  lexemeSchema,
  sentenceSchema,
  tartanSchema,
  topicSchema,
} from './schema';

/** Pure YAML-to-bundle step. File access lives in scripts/build-content.ts. */

export interface SourceFile {
  /** Path shown in error messages, e.g. "content/lexemes/core-nouns.yaml". */
  path: string;
  text: string;
}

export interface ContentInput {
  lexemes: SourceFile[];
  forms: SourceFile[];
  sentences: SourceFile[];
  tartans: SourceFile[];
  topics: SourceFile[];
}

export interface ContentBundle {
  lexemes: Lexeme[];
  forms: Form[];
  sentences: Sentence[];
  tartans: Tartan[];
  topics: Topic[];
}

export interface BuildResult {
  bundle: ContentBundle;
  errors: string[];
  warnings: string[];
}

export interface BuildOptions {
  /** Clans that must have at least one tartan once any tartans exist. */
  requiredClans?: string[];
}

export const DEFAULT_REQUIRED_CLANS = ['Ferguson', 'Murchison'];

const tagNamespaceOk = (tag: string): boolean => {
  const [ns, ...rest] = tag.split(':');
  return (TAG_NAMESPACES as readonly string[]).includes(ns) && rest.join(':').length > 0;
};

export function buildContent(input: ContentInput, opts: BuildOptions = {}): BuildResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const requiredClans = opts.requiredClans ?? DEFAULT_REQUIRED_CLANS;

  /** Parse every file as a YAML list (or single object) and validate each entry. */
  function load<S extends z.ZodTypeAny>(
    files: SourceFile[],
    schema: S,
    opts: { single?: boolean } = {},
  ): { value: z.infer<S>; path: string }[] {
    const out: { value: z.infer<S>; path: string }[] = [];
    for (const file of files) {
      let doc: unknown;
      try {
        doc = parse(file.text);
      } catch (e) {
        errors.push(`${file.path}: invalid YAML (${(e as Error).message.split('\n')[0]})`);
        continue;
      }
      if (doc == null) continue; // empty file
      const entries = opts.single ? [doc] : Array.isArray(doc) ? doc : null;
      if (!entries) {
        errors.push(`${file.path}: expected a list of entries`);
        continue;
      }
      entries.forEach((entry, i) => {
        const where = opts.single ? file.path : `${file.path}[${i}]${idOf(entry)}`;
        const r = schema.safeParse(entry);
        if (r.success) out.push({ value: r.data, path: where });
        else for (const issue of r.error.issues) errors.push(`${where}: ${issue.path.join('.') || '(entry)'}: ${issue.message}`);
      });
    }
    return out;
  }

  const lexemeEntries = load(input.lexemes, lexemeSchema);
  const formEntries = load(input.forms, formSchema);
  const sentenceEntries = load(input.sentences, sentenceSchema);
  const tartanEntries = load(input.tartans, tartanSchema, { single: true });
  const topicEntries = load(input.topics, topicSchema);

  const bundle: ContentBundle = {
    lexemes: lexemeEntries.map((e) => ({ kind: 'lexeme' as const, ...e.value })),
    forms: formEntries.map((e) => ({ kind: 'form' as const, ...e.value })),
    sentences: sentenceEntries.map((e) => ({ kind: 'sentence' as const, ...e.value })),
    tartans: tartanEntries.map((e) => e.value),
    topics: topicEntries.map((e) => e.value),
  };

  // Unique ids across all learnable items, so a token can never be ambiguous.
  const seen = new Map<string, string>();
  for (const e of [...lexemeEntries, ...formEntries, ...sentenceEntries]) {
    const first = seen.get(e.value.id);
    if (first) errors.push(`${e.path}: duplicate id "${e.value.id}" (first in ${first})`);
    else seen.set(e.value.id, e.path);
  }
  uniqueBy(tartanEntries, 'tartan', errors);
  uniqueBy(topicEntries, 'topic', errors);

  // Token resolution.
  const lexemeIds = new Set(bundle.lexemes.map((l) => l.id));
  const wordIds = new Set([...lexemeIds, ...bundle.forms.map((f) => f.id)]);
  for (const e of formEntries) {
    if (!lexemeIds.has(e.value.lexemeId)) errors.push(`${e.path}: lexemeId "${e.value.lexemeId}" does not exist`);
  }
  for (const e of sentenceEntries) {
    e.value.tokens.forEach((t, i) => {
      if (t.itemId !== null && !wordIds.has(t.itemId)) {
        errors.push(`${e.path}: tokens.${i} ("${t.text}") links to unknown item "${t.itemId}"`);
      }
    });
  }

  // Tags must live in a known namespace.
  const tagged: { path: string; tags: string[] }[] = [
    ...lexemeEntries.map((e) => ({ path: e.path, tags: e.value.tags })),
    ...formEntries.map((e) => ({ path: e.path, tags: e.value.tags })),
    ...sentenceEntries.map((e) => ({ path: e.path, tags: e.value.tags })),
    ...topicEntries.map((e) => ({ path: e.path, tags: e.value.tags })),
  ];
  for (const { path, tags } of tagged) {
    for (const tag of tags) {
      if (!tagNamespaceOk(tag)) errors.push(`${path}: tag "${tag}" must start with one of ${TAG_NAMESPACES.map((n) => `${n}:`).join(' ')}`);
    }
  }

  // Tartans: the sett must parse, and every colour code it uses must be defined.
  for (const e of tartanEntries) {
    try {
      const codes = new Set(parseSett(e.value.sett));
      for (const code of codes) {
        if (!(code in e.value.colours)) errors.push(`${e.path}: sett uses colour "${code}" missing from colours`);
      }
    } catch (err) {
      errors.push(`${e.path}: ${(err as Error).message}`);
    }
  }

  if (bundle.tartans.length === 0) {
    warnings.push('No tartans yet, so the required-clan check is skipped.');
  } else {
    for (const clan of requiredClans) {
      if (!bundle.tartans.some((t) => t.clan.toLowerCase() === clan.toLowerCase())) {
        errors.push(`content/tartans: no tartan for required clan "${clan}"`);
      }
    }
  }

  // Stable output so the committed JSON only changes when content does.
  const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  bundle.lexemes.sort(byId);
  bundle.forms.sort(byId);
  bundle.sentences.sort(byId);
  bundle.tartans.sort(byId);
  bundle.topics.sort(byId);

  return { bundle, errors, warnings };
}

function idOf(entry: unknown): string {
  const id = (entry as { id?: unknown } | null)?.id;
  return typeof id === 'string' ? ` (${id})` : '';
}

function uniqueBy(entries: { value: { id: string }; path: string }[], label: string, errors: string[]): void {
  const seen = new Map<string, string>();
  for (const e of entries) {
    const first = seen.get(e.value.id);
    if (first) errors.push(`${e.path}: duplicate ${label} id "${e.value.id}" (first in ${first})`);
    else seen.set(e.value.id, e.path);
  }
}
