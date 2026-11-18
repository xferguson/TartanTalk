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

## Topic vocabulary: nature, hills and glens, wild animals and birds, food and drink, greetings
Files: `content/lexemes/topic-{nature,hills-glens-lochs,wild-animals-birds,food-drink,greetings}.yaml` (24, 24, 24, 25 and 29 entries), plus topic tags added to nine existing core words (`uisge`, `tir`, `beinn`, `loch`, `eilean`, `biadh`, `bainne`, `ith`, `ol`).

- Added after a tester picked these themes and the session had no words. No network access, so every entry is an unreviewed draft from general knowledge, as above. Ordering within a file follows everyday usefulness for a beginner, not a measured frequency count; `freqRank` is omitted.
- Greetings are whole set phrases (`pos: other`), including the formal/plural `sibh` and `leibh` forms.
- No sentences yet for these topics: scarves on them teach words only until a sentence task covers them.

## Sentences
Files: `content/sentences/love.yaml` (24) and `content/sentences/languages.yaml` (24), W2-A.

- **No corpus lookup was possible.** The drafting session did not query a Gaelic corpus or sentence database, and no external sentence was copied. Every sentence is an **AI draft** built by hand from the W1-J vocabulary, so all are `review: generated` with `source.ref` saying so. Nothing is claimed as sourced or verified.
- **Candidate corpus for a later pass:** Tatoeba (CC BY 2.0 FR, compatible with CC BY-SA content) has Scottish Gaelic sentences. Check its terms and attribution rules before importing, and set `review: sourced` only for lines actually taken from it.
- **Construction:** short, high-regularity patterns so each sentence unlocks from few words: `tha` + noun + `aig` + person (possession and language ability), `tha` + noun + `air` + person (feeling idioms such as `Tha eagal orm`), `tha` + person + adjective, plus a few imperatives and conjoined sentences. Every word is linked to a `lex:` or `form:` id; only punctuation has `itemId: null`.
- **Lenition:** a lenited surface form (`thoilichte`, `bhòidheach`) links to its base lexeme.
- **Translations** are natural English, so `Tha Gàidhlig agam` is "I speak Gaelic" rather than the literal "I have Gaelic".
- **Review needed:** W3-B or a Gaelic speaker should check every sentence for grammar and naturalness and set `verified` or `flagged`. Likely queries: `Tha Albais agaibh` (formal or plural), `Tha thu gràdhach` and `Tha an cù snog`.

