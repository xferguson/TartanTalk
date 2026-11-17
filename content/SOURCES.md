# Content sources and provenance

All content here is licensed CC BY-SA 4.0 (see `content/LICENSE`).

## Honest status of the Wave 1 vocabulary (W1-J)
The session that drafted W1-J1 to J3 had **no network access** to any dictionary or corpus. Every lexeme and form was written from the drafting model's general knowledge of Scottish Gaelic, so:

- Every entry is `review: unreviewed`. Nothing is `verified` and none is claimed to be corpus-sourced.
- `source.ref` names the dictionaries a reviewer should check against (Am Faclair Beag, LearnGaelic.scot). It is a to-check list, not a citation of a lookup that took place.
- `freqRank` is **omitted** everywhere. No frequency evidence could be gathered, and inventing ranks would be false precision.
- Spelling follows the Gaelic Orthographic Conventions (GOC). Accents are grave only.
- The W3-B content QA pass, or a Gaelic-speaking reviewer, should verify the entries and set `review: verified` or `flagged`.

## Prepositions (W1-J1)
`content/lexemes/prepositions.yaml` and `content/forms/*.yaml`. Ten prepositions with all seven persons: `aig`, `air`, `ann` (ann an), `à`, `do`, `de`, `bho`, `le`, `ri`, `mu`.

- Selection: these are the ten most commonly taught inflecting prepositions, chosen from general teaching practice, not from a measured count. `gu` (thugam…), `roimh`, `eadar`, `fo`, `thar` and `troimhe` are backlog.
- The 2pl slot is also the formal singular. 3sg-m `ann` is the bare `ann`; `air` 2sg and 3sg-m are `ort` and `air`.
- The lexeme id for `à` is `lex:as` (ASCII ids), matching the tag `prep:as`.

## Core
Files: `content/lexemes/core-nouns.yaml` (50), `core-verbs.yaml` (50, root form), `core-function.yaml` (pronouns, articles, `tha`/`is`, conjunctions, question words, particles, demonstratives, adverbs, numbers one to ten).

- Selection: chosen as high-utility beginner vocabulary, not ranked by a corpus. If a frequency list (for example from the Gaelic Corpus of the University of Glasgow, or the Learn Gaelic 1000-word list) becomes reachable, add `freqRank` and swap any low-ranked entries.
- `dè` (what) has the id `lex:de-what` to avoid clashing with the preposition `de`.
- Verbs are the root (imperative) form, which is the dictionary form in Gaelic; `bi` is the verb, with `tha`, `bha`, `bidh` and `is` listed separately because sentences use them directly.
- `cridhe`, `caraid` and `cànan` carry topic tags for love and languages so those scarves include them.

## Topics (W1-J3)
`content/topics.yaml` lists every starter theme in the PRD. Only **love and feelings** and **talking about languages** have vocabulary (`topic-love.yaml`, `topic-languages.yaml`) so far.

## Sentences
Owned by W2-A.
