import { describe, expect, it } from 'vitest';
import { buildContent, type ContentInput } from '../../../src/content/build';
import { indexItems, loadContent } from '../../../src/content';

const src = `source: { ref: "Am Faclair Beag", licence: "CC BY-SA 4.0" }\n  review: sourced`;
const lex = (id: string, extra = '') =>
  `- id: ${id}\n  gd: x\n  en: y\n  pos: noun\n  tags: [pos:noun]\n  ${src}\n${extra}`;

const tartan = (id: string, clan: string, sett = 'B/30 R4 G/34') => `
id: ${id}
name: ${clan}
clan: ${clan}
sett: "${sett}"
colours: { B: "#2c4084", R: "#c4202f", G: "#0b5a3a" }
provenance: { ref: "Register" }
verified: false
`;

const valid = (): ContentInput => ({
  lexemes: [{ path: 'l.yaml', text: lex('lex:tha') + lex('lex:aig') }],
  forms: [
    {
      path: 'f.yaml',
      text: `- id: form:aig.1sg\n  lexemeId: lex:aig\n  gd: agam\n  en: at me\n  person: 1sg\n  tags: [prep:aig]\n  ${src}\n`,
    },
  ],
  sentences: [
    {
      path: 's.yaml',
      text: `- id: sent:1
  gd: Tha agam.
  en: I have.
  altGd: []
  tokens:
    - { text: Tha, itemId: "lex:tha" }
    - { text: agam, itemId: "form:aig.1sg" }
    - { text: ".", itemId: null }
  pattern: tha-aig
  tags: [topic:love]
  ${src}
`,
    },
  ],
  tartans: [
    { path: 't1.yaml', text: tartan('ferguson-old', 'Ferguson') },
    { path: 't2.yaml', text: tartan('murchison', 'Murchison') },
  ],
  topics: [{ path: 'topics.yaml', text: `- { id: love, name: Love, tags: [topic:love], starter: true }` }],
});

const errorsFor = (mutate: (i: ContentInput) => void): string[] => {
  const input = valid();
  mutate(input);
  return buildContent(input).errors;
};

describe('buildContent', () => {
  it('accepts valid content and adds the kind from the folder', () => {
    const r = buildContent(valid());
    expect(r.errors).toEqual([]);
    expect(r.bundle.lexemes.map((l) => l.kind)).toEqual(['lexeme', 'lexeme']);
    expect(r.bundle.forms[0].kind).toBe('form');
    expect(r.bundle.sentences[0].kind).toBe('sentence');
  });

  it('sorts by id so output is stable', () => {
    expect(buildContent(valid()).bundle.lexemes.map((l) => l.id)).toEqual(['lex:aig', 'lex:tha']);
  });

  it('rejects duplicate ids across files', () => {
    const e = errorsFor((i) => i.lexemes.push({ path: 'dup.yaml', text: lex('lex:tha') }));
    expect(e).toEqual([expect.stringContaining('duplicate id "lex:tha"')]);
  });

  it('rejects an id with the wrong kind prefix', () => {
    expect(errorsFor((i) => (i.lexemes = [{ path: 'l.yaml', text: lex('form:oops') }]))[0]).toContain('lex:');
  });

  it('rejects a form whose lexeme is missing', () => {
    const e = errorsFor((i) => (i.lexemes = [{ path: 'l.yaml', text: lex('lex:tha') }]));
    expect(e.join()).toContain('lexemeId "lex:aig" does not exist');
  });

  it('rejects a sentence token that links to an unknown item', () => {
    const e = errorsFor((i) => (i.sentences[0].text = i.sentences[0].text.replace('lex:tha', 'lex:nope')));
    expect(e.join()).toContain('unknown item "lex:nope"');
  });

  it('rejects a sentence token that links to another sentence', () => {
    const e = errorsFor((i) => (i.sentences[0].text = i.sentences[0].text.replace('lex:tha', 'sent:1')));
    expect(e.join()).toContain('unknown item "sent:1"');
  });

  it('rejects tags outside the known namespaces', () => {
    const e = errorsFor((i) => (i.lexemes[0].text = i.lexemes[0].text.replace('pos:noun', 'colour:red')));
    expect(e.join()).toContain('tag "colour:red"');
  });

  it('accepts a new tag value in a known namespace', () => {
    const e = errorsFor((i) => (i.lexemes[0].text = i.lexemes[0].text.replace('pos:noun', 'topic:weather')));
    expect(e).toEqual([]);
  });

  it('requires provenance on every item', () => {
    const e = errorsFor((i) => (i.lexemes[0].text = i.lexemes[0].text.replace('source: { ref: "Am Faclair Beag", licence: "CC BY-SA 4.0" }', 'source: { ref: "", licence: "x" }')));
    expect(e.join()).toContain('source.ref');
    const missing = errorsFor((i) => (i.tartans[0].text = i.tartans[0].text.replace('provenance: { ref: "Register" }', '')));
    expect(missing.join()).toContain('provenance');
  });

  it('rejects unknown keys', () => {
    const e = errorsFor((i) => (i.lexemes[0].text += '  gendr: m\n'));
    expect(e.join()).toContain('gendr');
  });

  it('reports invalid YAML and non-list files with the path', () => {
    expect(errorsFor((i) => i.lexemes.push({ path: 'bad.yaml', text: 'a: [' }))[0]).toMatch(/^bad\.yaml: invalid YAML/);
    expect(errorsFor((i) => i.lexemes.push({ path: 'obj.yaml', text: 'a: 1' }))[0]).toBe('obj.yaml: expected a list of entries');
  });

  it('requires Ferguson and Murchison once tartans exist', () => {
    const e = errorsFor((i) => i.tartans.pop());
    expect(e).toEqual([expect.stringContaining('"Murchison"')]);
  });

  it('skips the required-clan check, with a warning, when there are no tartans', () => {
    const input = { ...valid(), tartans: [] };
    const r = buildContent(input);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toHaveLength(1);
  });

  it('rejects a sett that does not parse or uses an undefined colour', () => {
    expect(errorsFor((i) => (i.tartans[0].text = tartan('ferguson-old', 'Ferguson', 'B/30 oops')))[0]).toContain('Invalid sett stripe');
    expect(errorsFor((i) => (i.tartans[0].text = tartan('ferguson-old', 'Ferguson', 'B/30 K4 G/34')))[0]).toContain('colour "K"');
  });

  it('rejects duplicate tartan ids', () => {
    const e = errorsFor((i) => i.tartans.push({ path: 't3.yaml', text: tartan('murchison', 'Murchison') }));
    expect(e.join()).toContain('duplicate tartan id');
  });
});

describe('loader', () => {
  it('returns every table and indexes learnable items by id', () => {
    const bundle = loadContent();
    for (const key of ['lexemes', 'forms', 'sentences', 'tartans', 'topics'] as const) {
      expect(Array.isArray(bundle[key])).toBe(true);
    }
    expect(indexItems(bundle).size).toBe(bundle.lexemes.length + bundle.forms.length + bundle.sentences.length);
  });
});
