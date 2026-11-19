# Content format guide

All learning content is YAML in this folder, licensed CC BY-SA 4.0. `npm run content` validates it and writes JSON to `src/content/generated/`, which the app loads through `src/content/`. Commit the generated JSON with your YAML: CI re-runs the script and fails if the two disagree.

The exact shapes are in `docs/WORKPLAN.md`, Appendix A, and the TypeScript contracts in `src/domain/types.ts`.

## Where things go
| Folder or file | Holds | Item id prefix |
|---|---|---|
| `lexemes/*.yaml` | A YAML list of words | `lex:` |
| `forms/*.yaml` | A YAML list of inflected forms, e.g. `agam` for `aig` | `form:` |
| `sentences/*.yaml` | A YAML list of sentences and idioms | `sent:` |
| `tartans/<id>.yaml` | One tartan per file (an object, not a list) | none |
| `topics.yaml` | A YAML list of topics | none |

Do not write `kind`. It comes from the folder.

## What the build checks
- **Shape.** Every field matches the schema in `src/content/schema.ts`. Unknown keys are errors, so a typo like `gendr` fails.
- **Ids.** Each id has the right prefix and is unique across lexemes, forms and sentences. Tartan and topic ids are unique too.
- **Links.** A form's `lexemeId` must exist. A sentence token's `itemId` must be a `lex:` or `form:` id, or `null` for punctuation and untracked words.
- **Tags.** Every tag starts with `topic:`, `prep:`, `grammar:`, `pos:` or `level:`. New values are fine; new namespaces are not.
- **Provenance.** Every item needs `source.ref` and `source.licence`. Every tartan needs `provenance.ref`.
- **Tartans.** The `sett` parses, every colour code it uses is in `colours`, and colours are `#rrggbb`. Once any tartan exists, there must be a Ferguson and a Murchison.

Every problem is printed with its file and entry, and nothing is written until all are fixed.

## Honest metadata
- Set `review` truthfully: `sourced` (from a cited source), `generated` (AI draft), `unreviewed`, `verified` (checked by a fluent speaker) or `flagged`.
- Set a tartan's `verified: false` until its sett has been checked against the register.
