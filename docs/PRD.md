<!-- Status: approved product plan. Next: tech-lead planning phase. -->

# Tartan Talk: Product Requirements (PRD draft v0.3)

## 1. Context
Tartan Talk is a Scottish Gaelic language-learning PWA that replaces streaks and scores with a craft metaphor. The learner chooses a focus (prepositions, topics, grammar patterns) and **weaves a scarf** in a real clan tartan as they learn it. Forgetting lets **moths** eat holes in the cloth; reviewing **reweaves** them. The aim is intrinsic, cozy motivation, like caring for a Tamagotchi, instead of guilt-driven daily streaks. The repo is empty, so this is a greenfield build.

**Vocabulary rule:** tartans are woven. All copy, UI, code identifiers and docs say weave / loom / shuttle / warp / weft / reweave, never "knit".

## 2. Principles
- No streaks, no scores, no loss of progress. A neglected scarf just waits for you.
- Variety without overload: items recur in new combinations, never too repetitive and never too novel.
- Craft and tactility: the cloth is the progress display.
- Local, offline, private, free, open source.

## 3. Learner and content
- **Audience:** beginners first, with a designed path to intermediate (content model and tags must make adding intermediate material cheap).
- **v1 content base:**
  - The 10 most common prepositions with full pronominal forms (1sg, 2sg, 3sg-m, 3sg-f, 1pl, 2pl/formal, 3pl).
  - The 50 most common nouns and 50 most common verbs.
  - The next most common function words (pronouns, articles, conjunctions, `tha`/copula, question words, numbers, and time words as frequency allows).
  - Sentences and idioms composed from combinations of the above. Prefer words that are grammatically necessary, frequent, and tied to classic idioms or sayings.
  - Backlog notes for remaining prepositions and further vocabulary.
- **Starter topic themes** (each is a tag and a suggested starter scarf; vocabulary beyond the frequency core is added per theme):
  - From the user: love; languages (learning and speaking); nature; weather; music; sport; weaving and wool; Scottish farm animals.
  - Chosen from designer suggestions: food and drink; greetings and hospitality; family and home; hills, glens and lochs (place names); sea, boats and fishing; wild animals and birds; croft and Highland work; folklore and myth; festivals and ceilidh; proverbs and sayings; feelings and character; clothing and kilts.
  - Backlog candidates (not selected yet): time/days/seasons (likely covered as function words), clans/history/tartan vocabulary, body and health, travel and directions.
- **Content sources:** openly licensed corpora where licences allow (check per source; record provenance), otherwise AI-generated from grammar templates. AI content ships labelled, with an in-app "flag error" button; revisit if quality proves poor.
- **Tagging:** every word, inflected form, grammar pattern, sentence and idiom carries tags (part of speech, preposition, topic, grammar pattern, difficulty, source, review status) so scarf filters work.
- **Dependencies:** a sentence depends on its words and forms; introduce prerequisites first.
- **Dialect:** standard learner Gaelic, mainland-neutral. Regional variants later.
- **Audio:** try for day one; defer if quality is poor.
- **Accents:** grave accents (à è ì ò ù). Unaccented typed input is accepted with a gentle correction and small SRS penalty; accent helper keys on mobile.

## 4. Scarf model
- **A scarf is a learner-defined focus**, not one grammar topic. Starting a scarf means picking tags from a guided multi-select menu (prepositions, topics, grammar patterns), or tapping a suggested starter scarf (e.g. "Love and feelings", "Talking about languages", where `aig` gives "Tha Gàidhlig agam"). A preview shows what you'll learn ("N new items, M already woven in other scarves"). Tags can be added later.
- **Scarves are long-lived.** Pause one, weave another, return anytime. Several scarves may overlap in tags.
- **One memory state per item (global), woven only into the scarf that introduced it.** Other scarves whose filter matches skip already-known items and feed only new ones. Sentences are items too, so a sentence built from known words still counts as new. Moth holes appear in the owning scarf. Each item shows which scarf owns it.
- **Smallest unit:** one woven block per learnable item (word, inflected form such as agam/agad/aige, sentence pattern or idiom), each with its own schedule. Moths eat only the forgotten blocks.
- **Length:** measured in **ells** (traditional Scots measure, ~37 in / 94 cm), with a tap-to-toggle inch/cm hint. Each item type adds a set fraction of an ell (word < form < sentence/idiom; tune later). Variety unlocks pattern bands.
- **Tartan choice:** free pick from a searchable library (clan/family, region, colour). Start with ~50-100 setts rendered procedurally from thread-count data. **Must include Ferguson and Murchison and their variants** (e.g. Murchison/MacMurchie/Murchie; Ferguson of Atholl, Argyll, Perthshire, hunting/dress as available).
- **Tartan data:** research open or public-domain sett sources first; transcribe a curated list ourselves; do not scrape sources whose terms forbid it. Record provenance per sett.

## 5. Learning flow and scheduling
**Open workshop:** the learner chooses what to work on; no fixed session length. Sessions can mix new items and reviews.

**First-time learning (Memrise-style, within one session):**
- A new item is introduced, then tested on a rising ladder of exercises: recognition (multiple choice / word bank), then cloze (fill the blank), then full-sentence or typed production.
- **Learned = correct twice in the session.** Only then is its block woven into the scarf and the item enters the review schedule.
- A miss re-queues the item a few cards later (relearn after about 10 minutes or after the rest of the batch, whichever is longer). Its row is not woven until it is answered correctly.
- Construction practice swaps forms ("Tha gaol agam ort" vs "Tha gaol agad orm") so learners assemble rather than memorise.

**Reviews (Anki-style rating):**
- Answer first; if correct, tap **Hard / Good / Easy** (Good highlighted by default). A wrong answer is automatically **Again** with no extra tap.
- Easy pushes the next review further out, Hard pulls it closer.

**Scheduler: seeded ladder, then FSRS:**
- First reviews after "learned" follow a seeded ladder: 1 day, then 4 days, then 16 days (x4 each time), for predictable early behaviour.
- FSRS then takes over and adapts intervals to the learner's accuracy. A single setting for **desired retention** (default about 90%) replaces fixed-interval settings.

**Unlocking and pacing of sentences (designed from research; weights are ours to tune):**
- **Unlock rule:** a sentence is available only when every word and form in it has been learned (woven). Learning a word can unlock several sentences at once.
- **Rhythm:** alternate small word batches (3-4 words) with the sentences they unlock, then more words, then more sentences. If a batch unlocks nothing, choose the next words to complete a sentence.
- **Spacing within and across sessions:** at most **2 sentences per newly learned item** in its first session; the rest are held back (like Anki's buried siblings) for later sessions and reviews, preferring sentences that put the item in a different slot or with different partners. Never show the same focal item back to back (minimum gap of about 4 cards), and avoid consecutive sentences with the same skeleton or filler. This reflects research that spacing beats massing for vocabulary, while the exact interval shape matters less. With many new words repetition is unavoidable, so these are soft preferences, not hard blocks.
- **Implicit credit (positive-only, partial):** a typed full sentence gives full credit to every word and form in it. A cloze on one word fully reviews that word and gives the other words a small partial credit (about a quarter), only when they are due or slipping. Errors penalise only the item actually tested, never the others. Credit can delay or heal moth holes. Inspired by fractional implicit repetition in Math Academy's work; no source tests it for vocabulary, so weights need tuning against real use.

**Moths and reweaving:**
- A moth hole appears on a woven block when its item is due for review (recall probability has dropped), in the owning scarf. Holes are gentle: they never delete progress, and nothing is lost by waiting.
- Tapping a hole opens a reweaving session for that scarf. Mending can also be started from the shelf for everything due.
- **Misses in reviews:** the first miss just reschedules the item with nothing visibly happening. **Two misses in a row marks the item "tangled" (difficult).**
- **Tangled items** are re-taught in reweaving as if new (the learning ladder again, with hints), while non-tangled items get quick reviews. A **Tangles basket** also collects every tangled item for focused practice, similar to Memrise's difficult words.
- Tangled status clears once the item is learned again in the ladder.

## 6. Design direction
- **Voice:** warm and wry with a touch of Gaelic ("Madainn mhath!" on the shelf, "Math dhèanta" for a right answer), always with English alongside; encouraging when you slip.
- **Moths:** cute and mischievous: small round fuzzy moths with big eyes that nibble tiny holes and flutter off when you reweave. Never scary, never guilt.
- **Look:** realistic woven twill with soft wool shading, tactile workshop UI, hand-drawn moths and shuttles. **Mood is undecided**, so the first design task is a mock-up round of several palette directions for the shelf and one scarf screen:
  1. Cozy hearth: warm cream, peat browns, heather purple, lamplight.
  2. Misty highlands: cool greys, loch blue, bracken green.
  3. A red-led palette (rich reds, deep wine, warm neutrals).
  4. A further alternative base palette (e.g. forest green and gold or deep navy and saffron).
  Compare side by side, then the user chooses or blends.
- **Icon:** explore a broad set of concepts and compare at app-icon sizes. Seeds: tartan speech bubble, shuttle and thread forming a T, folded scarf with a moth, thistle in plaid, and especially a **thistle speech bubble** (or another thistle motif that signals language). Add further ideas of our own. Must read clearly at 48 px and in dark/light.
- **Home = the scarf shelf:** each scarf with its tartan, length in ells and moth damage. This is the menu.

## 7. Technical constraints (product-level; details in tech phase)
- Installable offline PWA; data local-only in IndexedDB, **no accounts ever**; export/import backup.
- Free and open source (code licence and content licence to be chosen in tech phase).
- **Deploy to GitHub Pages automatically on merge to `main`.** The user says Pages is already enabled on the repo; we add the GitHub Actions workflow (CI + deploy). Verify Pages settings and base-path handling during implementation.

## 8. Delivery
- **Design first:** palette and icon mock-up round (section 6), then pick a direction.
- **Milestone 1:** vertical slice of the full loop (scarf setup, learning ladder, SRS, weaving renderer, moths and reweaving, tartan library) on a meaningful slice of the v1 content base. Then expand content in batches.
- **Process (see CLAUDE.md):** always use a PR. Once CI is green the agent marks it ready, approves and merges it. The user's approval is needed only when they explicitly ask for it on a specific change.
- Save the final PRD to `docs/PRD.md`, then run a separate plan phase with a tech-lead persona.

## 9. Open questions
- Tuning of sentence-unlock pacing, similarity measure, and implicit-credit weights (ship with telemetry-free, on-device logging for the learner's own insight, or manual tuning via test learners).
- Moth timing: how holes grow the longer an item is overdue (size/number), and any cap so scarves never look ruined.
- Frequency-list and sentence-corpus sources and licences; audio sourcing.
- Technical decisions are in `docs/TECH_PLAN.md` (stack, FSRS, renderer, schema, licences: MIT code, CC BY-SA 4.0 content).
