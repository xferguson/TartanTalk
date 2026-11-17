/**
 * Validate `content/**.yaml` and write the bundle to `src/content/generated/*.json`.
 * Run with `npm run content`. Exits non-zero, printing every problem, if content is invalid.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent, type SourceFile } from '../src/content/build';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const outDir = join(root, 'src/content/generated');

function yamlFiles(dir: string): SourceFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.ya?ml$/.test(d.name))
    .map((d) => join(dir, d.name))
    .sort()
    .map((p) => ({ path: relative(root, p), text: readFileSync(p, 'utf8') }));
}

const topicsFile = join(contentDir, 'topics.yaml');
const { bundle, errors, warnings } = buildContent({
  lexemes: yamlFiles(join(contentDir, 'lexemes')),
  forms: yamlFiles(join(contentDir, 'forms')),
  sentences: yamlFiles(join(contentDir, 'sentences')),
  tartans: yamlFiles(join(contentDir, 'tartans')),
  topics: existsSync(topicsFile) ? [{ path: relative(root, topicsFile), text: readFileSync(topicsFile, 'utf8') }] : [],
});

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} content problem(s). Nothing written.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const [name, data] of Object.entries(bundle)) {
  writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
}
console.log(
  `Content ok: ${bundle.lexemes.length} lexemes, ${bundle.forms.length} forms, ${bundle.sentences.length} sentences, ${bundle.tartans.length} tartans, ${bundle.topics.length} topics.`,
);
