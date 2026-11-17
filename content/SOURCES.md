# Content sources

All content is CC BY-SA 4.0 (see `LICENSE` in this folder). Every item carries a `source` and a `review` status.

## Core
Applies to `content/lexemes/core-*.yaml`, `prepositions.yaml`, `forms/**` and `topic-*.yaml` (W1-J).

**How the lists were chosen.** The entries were chosen by the editor from standard learner Gaelic. This was done from knowledge, not by processing a frequency corpus. No network research was done in this task. So:

- `freqRank` is **left out on every item**. A rank is added only when it can be cited from a real list.
- Every item is `review: unreviewed`. None are `verified`.
- The `source.ref` on each item says the same thing: written by the editor, with a cross-check pending.
- The paradigms (the 7 forms of each preposition) are standard grammar facts. No text from any dictionary or course was copied.

**Follow-ups before these items can be marked `sourced` or `verified`:**
1. Cross-check each entry against Am Faclair Beag (dictionary), Akerbeltz (grammar tables) and a frequency source. Candidate frequency sources are the Corpas na Gàidhlig / Gaelic Corpus frequency lists and Wiktionary's Scottish Gaelic frequency list. Check each source's licence before use.
2. A fluent speaker should review spellings, grave accents, gender and glosses.
3. Add `freqRank` where a cited list supports it. Revisit whether the 50 nouns and 50 verbs are really the most frequent ones.

**Conventions.**
- Verbs are listed in the dictionary (imperative or root) form, glossed as "to X".
- `à` has the lexeme id `lex:as` and forms `form:as.*`, so ids stay ASCII.
- `gu math` and `cia mheud` are multi-word entries.
- A few ids differ from the Gaelic, to avoid clashes between homographs: `lex:de-what` is `dè`, `lex:do-poss` is the possessive `do`, `lex:a-poss` and `lex:an-poss` are possessives.

**Prepositions in scope:** `aig`, `air`, `ann`, `à`, `bho`, `do`, `de`, `le`, `mu`, `ri`. Backlog: `gu`, `fo`, `thar`, `eadar`, `ro`, `tro`, `seach`, `gus`.
