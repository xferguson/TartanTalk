# Content sources and provenance

All content here is licensed CC BY-SA 4.0 (see `content/LICENSE`).

## Honest status of the Wave 1 vocabulary (W1-J)
The session that drafted W1-J1 to J3 had **no network access** to any dictionary or corpus. Every lexeme and form was written from the drafting model's general knowledge of Scottish Gaelic, so:

- Every entry is `review: unreviewed`. Nothing is `verified` and none is claimed to be corpus-sourced.
- `source.ref` names the dictionaries a reviewer should check against (Am Faclair Beag, LearnGaelic.scot). It is a to-check list, not a citation of a lookup that took place.
- `freqRank` was omitted at first, because no frequency evidence could be gathered. It now comes from a real corpus where the word occurs (see "Frequency ranks" below) and is still omitted elsewhere.
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
`content/topics.yaml` lists every starter theme in the PRD. W1-J3 gave vocabulary only to **love and feelings** and **talking about languages**. Every topic now has vocabulary and sentences (see "Content expansion" below).

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

## Frequency ranks (`freqRank`)
Source: the **Scottish Gaelic Universal Dependencies treebank** (UD_Scottish_Gaelic-ARCOSG), from the Annotated Reference Corpus of Scottish Gaelic (Lamb *et al.* 2016). Licence: **CC BY-SA 4.0**, the same as this content. Files: `gd_arcosg-ud-{train,dev,test}.conllu` from https://github.com/UniversalDependencies/UD_Scottish_Gaelic-ARCOSG (fetched through `raw.githubusercontent.com`).

- **Method:** count every token's lemma (lower-cased, punctuation and placeholders such as `[name]` dropped), about 84,000 tokens in all. A lexeme's `freqRank` is the competition rank of its lemma count: 1 is the most frequent, and ties share a rank. A headword that is not a corpus lemma (`tha`, `bha`, `bidh`, `eil`, `robh`, which the corpus lemmatises as `bi`) uses the count of its surface form instead. `thoir` is looked up as the corpus lemma `toir`. Phrases and other multiword entries are not ranked.
- **Coverage:** 834 of 1,387 lexemes occur in the corpus and carry a rank. Words that never occur (most specialist topic words, such as `meanbh-chuileag` or `tairsgeir`) have no `freqRank`, so the session builder places them after every ranked word.
- **Bias:** the corpus is small and mixes conversation, sport commentary, radio news, folk tales and fiction. Sport words (`ball`, `buille`) rank higher than everyday speech would put them. Treat ranks as ordinal evidence, not exact frequency.
- **Homographs** share a rank: `do` (to), `do` (your) and the past particle `do` all get the rank of the lemma `do`.

## Content expansion: every topic, 50+ new words with sentences
Added because a tester opened a topic with no sentences. Every one of the 19 topics gained at least 50 new topic-tagged words, and each new word appears in at least one sentence.

- **Vocabulary:** `content/lexemes/topic-*.yaml` (new files for weather, music, sport, weaving, farm animals, family and home, sea and boats, croft work, folklore, festivals and ceilidh, proverbs and clothing; appended to the other seven). `content/lexemes/core-grammar.yaml` holds the grammar the sentences need: the verb particle `ag`, the dependent verbs `eil` and `robh`, the question particle `an`, the past particle `do`, possessives (`mo`, `do`, `ar`, `ur`), common adjectives (`math`, `mòr`, `beag`, `ùr`…), adverbs and numbers. These are untagged supporting words, pulled into a scarf through its sentences.
- **Choice of words:** high-utility words for each theme were chosen first, from general knowledge. Where the corpus attests a word, its `freqRank` puts it ahead in a session.
- **No dictionary or sentence corpus was reachable** (`faclair.com`, `learngaelic.scot`, `tatoeba.org` and `dasg.ac.uk` were refused by the session proxy). As with W1-J, every new lexeme is `review: unreviewed`, and the source names the dictionaries a reviewer should check against.
- **Sentences:** `content/sentences/<topic>.yaml` (and `love-more.yaml`, `languages-more.yaml` next to the W2-A files). They are AI drafts built from the vocabulary, `review: generated`. Each word links to its base lexeme: lenited, plural, genitive and dative forms, verb tenses (`chunnaic`, `rinn`, `thèid`) and verbal nouns (`ag ithe`, `a' dol`) all link to the root. Articles (`an`, `am`, `a'`, `na`, `nan`) link to `lex:an` or `lex:na`, the progressive `a'`/`ag` to `lex:ag`, and contractions such as `sa`, `san`, `anns` to `lex:ann`. Multiword names such as `Inbhir Nis` and `dà shealladh` are one token.
- **Proverbs:** the 31 sayings marked as traditional are well-known Gaelic proverbs, recalled from general knowledge rather than looked up. They are `isIdiom: true` and `review: unreviewed`, and their source asks a reviewer to check them against Nicolson, *A Collection of Gaelic Proverbs and Familiar Phrases* (1881, public domain). Idioms such as `Tha cianalas orm` or `Chan eil e gu diofar` are AI drafts marked `isIdiom: true`.
- **Known approximations a reviewer should check:**
  - Some verbal-noun objects use the spoken nominative instead of the genitive (`ag ionnsachadh Gàidhlig`).
  - `lex:na` is glossed as the plural article but also carries the feminine genitive singular (`na grèine`).
  - The spelling `ocras` (W1-J) is kept for `Tha an t-ocras orm`, though GOC prefers `acras`.
  - `clach` (GOC) links to the W1-J headword `cloch`.

