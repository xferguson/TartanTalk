# Tartan Talk Workplan: first vertical slice

This is the single source of truth for who is doing what. Product decisions live in `docs/PRD.md`; technical decisions in `docs/TECH_PLAN.md` and `docs/TECH_PLAN_2.md`.

## Goal: the vertical slice
A learner, fully offline on a phone, can:
1. Start a scarf from a starter suggestion (e.g. "Love and feelings": `aig`, `air`, love vocabulary) and pick a tartan, including Ferguson and Murchison variants.
2. Learn words and pronominal forms on the exercise ladder (recognise, then cloze, then type). Each item is woven into the scarf after 2 correct answers.
3. Unlock and learn sentences once all their words are known, with spacing and similarity rules.
4. Review on the seeded 1, 4, 16 day ladder, then FSRS, rating Hard/Good/Easy, with implicit credit from sentences.
5. See moth holes appear on overdue items (small, medium, large, capped), and reweave them, with tangled items re-taught.
6. See every scarf on the shelf with its length in ells.

A dev-only clock override lets testers fast-forward time to see moths.

## How to use this plan (for every agent session)
1. Pick a task whose **Status** is `todo` and whose **Depends on** tasks are all `done`. Take only one task per session unless it says otherwise.
2. In a docs-only PR, or as the first commit of your task PR, set the task's status to `in progress (<branch>)`. Edit only your own task's Status line.
3. Stay inside the task's **Owns** paths. If you must touch a path someone else owns, stop and note it in your PR and in `docs/LEARNINGS.md`, or split the change into a separate small PR.
4. When your PR merges, set the status to `done (#PR)` in a docs-only follow-up. CI skips docs-only PRs, so these merge straight away.

### Shared files and conflict rules
| File | Rule |
|---|---|
| `package.json`, `package-lock.json` | Every dependency for the slice is already installed (F1). Do not add dependencies without a separate `deps:` PR, and note it here first. W1-H may add npm **scripts** only. |
| `src/domain/types.ts` | This is the contract. Change it only in a dedicated `contract:` PR, which merges before dependent work. |
| `src/app/router.tsx` | All routes are already registered. Screen tasks edit only their own `src/ui/screens/<Screen>/` folder. |
| `src/db/db.ts` | Owned by W1-K after F1. Others use its repository functions. |
| `.github/workflows/*` | Owned by W1-H (to add the content step). Otherwise leave unchanged. |
| `docs/WORKPLAN.md` | Edit only your own task's **Status** line, or add a new task block at the bottom of a wave. Keep the blank lines between fields: they stop parallel edits from conflicting. |
| `docs/LEARNINGS.md` | Add a new entry in alphabetical position under "Entries by slug" (never at the end). To record a repeat, add your PR number to that entry's **Seen in** line. |

### Engineering rules (summary; full text in `CLAUDE.md`)
- Write the failing test first (red), make it pass (green), then refactor.
- Domain logic stays pure in `src/domain` and takes `now` as an argument.
- Depend on interfaces. When you need another task's function that isn't merged yet, accept it as an injected parameter.

## Status legend
`todo` · `in progress (branch)` · `blocked (reason)` · `done (#PR)`

---

## Wave 0: Foundations (sequential, lead only)
### F1

- **Status:** done (#5)

UI foundations: tokens, self-hosted fonts, theme setting, hash router with every route, Layout/BottomNav, placeholder screens, shared types contract, **all slice dependencies installed**

- **Owns:** `package*.json`, `src/app/**`, `src/styles/**`, `src/domain/types.ts`, `src/domain/theme.ts`, `src/db/db.ts` (v1), `src/ui/components/{Layout,BottomNav,Placeholder}*`, `tests/setup.ts`

- **Depends on:** none

### F2

- **Status:** done (#5)

Process: this workplan, `docs/LEARNINGS.md`, `CLAUDE.md` rules, CI skips docs-only PRs

- **Owns:** `docs/WORKPLAN.md`, `docs/LEARNINGS.md`, `CLAUDE.md`, `.github/workflows/ci.yml` (paths-ignore)

- **Depends on:** none


## Wave 1: fully parallel (each depends only on Wave 0)
Domain tasks are pure TypeScript with unit tests and no UI. Data tasks are YAML and research with no code.

### W1-A

- **Status:** done (#13)

**Weave engine.** Spec: Appendix B2. Port the prototype from `design/mockups/round2.html`: sett parser (symmetric and asymmetric), 2/2 twill tile renderer (deterministic shading, cache), scarf layout from `wovenOrder` (band height by item kind), fringe, hole overlay drawing. Includes the `ScarfCanvas` React component (DPR, ResizeObserver, shuttle animation, reduced-motion) and a text alternative.

- **Owns:** `src/weave/**`, `src/ui/components/ScarfCanvas*`, `tests/unit/weave/**`

- **Depends on:** F1

### W1-B

- **Status:** done (#9)

**Moth holes.** `mothHoles(items, now, opts)` returns small, medium or large holes at 0×, 1× and 3× of the last interval overdue, caps visible damage at about 15% of the scarf, and returns any overflow as an extra-moths count.

- **Owns:** `src/domain/moths.ts`, `tests/unit/moths.test.ts`

- **Depends on:** F1

### W1-C

- **Status:** done (#12)

**Answer checking.** NFC normalisation, case folding, punctuation and apostrophe handling, accent-insensitive near match (correct, capped at Hard, with a nudge), `altGd` alternatives, and returning which token was wrong.

- **Owns:** `src/domain/answer.ts`, `tests/unit/answer.test.ts`

- **Depends on:** F1

### W1-D

- **Status:** done (#10)

**Scheduler.** Seeded ladder of 1, 4 and 16 days (Hard/Easy nudge within a step), then a ts-fsrs wrapper with desired retention. Again on a miss; two consecutive misses set `tangled`; relearning clears it. Retrievability helper.

- **Owns:** `src/domain/scheduler.ts`, `tests/unit/scheduler.test.ts`

- **Depends on:** F1

### W1-E

- **Status:** done (#11)

**Implicit credit.** A typed sentence gives full credit to every token item. A cloze gives the target full credit and the others weight 0.25, only when retrievability is below 0.9. Positive-only. Takes the "Good outcome" stability function as an injected parameter (no import from W1-D).

- **Owns:** `src/domain/credit.ts`, `tests/unit/credit.test.ts`

- **Depends on:** F1

### W1-F

- **Status:** done (#15)

**Unlock and session builder.** Sentence eligibility (all tokens learned); word batches of 3-4, then their sentences; at most 2 sentences per new item in its first session (the rest held back); a minimum 4-card gap for the same focal item; a same-pattern penalty; relearn at max(10 minutes, end of batch). Owner-scarf assignment (an item is woven only into the scarf that introduced it).

- **Owns:** `src/domain/unlock.ts`, `src/domain/session.ts`, `tests/unit/{unlock,session}.test.ts`, `tests/unit/fixtures/slice.ts`

- **Depends on:** F1

### W1-G

- **Status:** done (#20)

**Exercise builder.** From an item and the known items, build recognise (multiple choice with plausible distractors, e.g. other persons of the same preposition), cloze (blank chosen from the sentence tokens) and produce prompts.

- **Owns:** `src/domain/exercises.ts`, `tests/unit/exercises.test.ts`

- **Depends on:** F1

### W1-H

- **Status:** done (#21)

**Content pipeline.** zod schemas mirroring `types.ts`; `scripts/build-content.ts` (YAML to JSON in `src/content/generated/`) validates ids, token resolution, declared tags, required provenance, and that Ferguson and Murchison are present; a loader in `src/content/`; `content/README.md` (format guide); an npm `content` script; a CI step.

- **Owns:** `scripts/build-content.ts`, `src/content/**`, `content/README.md`, `.github/workflows/ci.yml`, `package.json` (scripts only)

- **Depends on:** F1

### W1-I

- **Status:** done (#44): approximate placeholder setts only; exact setts tracked in W-TARTAN-EXACT-SETTS

**Tartan data.** Research and transcribe setts with provenance: all available Ferguson variants, Murchison and MacKenzie-linked setts, and about 20 well-known clan tartans. Note the licence or terms for each source, and set `verified` honestly.

- **Owns:** `content/tartans/**`

- **Depends on:** F1 (format in Appendix A)

### W1-J1

- **Status:** done (#22)

**Prepositions and pronominal forms.** The 10 most common prepositions with all 7 person forms, sources and frequency evidence.

- **Owns:** `content/lexemes/prepositions.yaml`, `content/forms/**`

- **Depends on:** F1 (format in Appendix A)

### W1-J2

- **Status:** done (#22)

**Core vocabulary.** The 50 most common nouns, 50 most common verbs, and the next most common function words (pronouns, articles, `tha`/`is`, conjunctions, question words, numbers), with a frequency source documented in `content/SOURCES.md` (section "Core").

- **Owns:** `content/lexemes/core-*.yaml`, `content/SOURCES.md#core`

- **Depends on:** F1

### W1-J3

- **Status:** done (#22)

**Starter topics.** `content/topics.yaml` (all starter topics from the PRD) plus slice topic vocabulary for **love and feelings** and **languages**.

- **Owns:** `content/topics.yaml`, `content/lexemes/topic-*.yaml`

- **Depends on:** F1

### W1-K

- **Status:** done (#26)

**Database v2 and repositories.** Dexie version 2 with `progress`, `reviewLog` and `scarves` tables; repository functions (get, put, list due, append review, scarf CRUD); export/import JSON; migration tests.

- **Owns:** `src/db/**`, `tests/unit/db/**`

- **Depends on:** F1

### W1-L

- **Status:** done (#33)

**UI kit.** Spec: Appendix B3. Button, Chip, Card, TagPicker, RatingBar (Hard/Good/Easy with interval hints), AccentKeys (à è ì ò ù that insert at the cursor), ProgressBar, MothSprite. CSS Modules on Hearth tokens; component tests.

- **Owns:** `src/ui/components/{Button,Chip,Card,TagPicker,RatingBar,AccentKeys,ProgressBar,MothSprite}*`, `tests/unit/components/**`

- **Depends on:** F1

### W1-M

- **Status:** done (#35)

**Audio research.** Find openly licensed Scottish Gaelic audio for words and sentences, and assess TTS options for quality and licence. Recommend a go or no-go for day-one audio.

- **Owns:** `docs/research/audio.md`

- **Depends on:** none


## Wave 2: assembly (parallel within the wave once dependencies are met)
### W2-A

- **Status:** done (#36)

**Sentences.** Sentences and idioms built from J1-J3 vocabulary with full token links, patterns, tags and provenance (corpus first, then AI-generated and labelled). Enough for the love and languages scarves to unlock at least 2 sentences per batch.

- **Owns:** `content/sentences/**`, `content/SOURCES.md#sentences`

- **Depends on:** W1-H, W1-J1, W1-J2, W1-J3

### W2-B

- **Status:** done (#41)

**App services and store.** A Zustand session store; services wiring the domain to the DB (start scarf, next card, answer, rate, weave, reweave, tangles); a clock service (the Settings control is W2-B2).

- **Owns:** `src/app/services/**`, `src/app/store/**`, `src/app/clock.ts`, `tests/unit/services/**`

- **Depends on:** W1-B, W1-C, W1-D, W1-E, W1-F, W1-G, W1-K

### W2-B2

- **Status:** todo

**Dev time-travel control.** Settings gets a developer section (shown only in dev or behind a tap-seven-times toggle) with "+1 day", "+1 week" and "Reset" buttons on `appClock` from W2-B, saving the offset with `saveClockOffset` and loading it at boot with `loadClockOffset`. Split from W2-B because `SettingsScreen` and `src/main.tsx` are outside its Owns paths. W3-A needs it.

- **Owns:** `src/ui/screens/Settings/**`, `src/main.tsx` (boot load only)

- **Depends on:** W2-B

### W2-C

- **Status:** done (#39)

**Shelf screen.** Spec: Appendix B4. Real scarves from the DB, ScarfCanvas strips, length in ells, moth-hole chips, and Reweave / Start a new scarf actions.

- **Owns:** `src/ui/screens/Shelf/**`

- **Depends on:** W1-A, W1-B, W1-K, W1-L

### W2-D

- **Status:** done (#37)

**Scarf detail screen.** Spec: Appendix B5. Vertical scarf with an ell ruler, tappable holes leading to reweave, item counts and tags.

- **Owns:** `src/ui/screens/Scarf/**`

- **Depends on:** W1-A, W1-B, W1-K, W1-L

### W2-E

- **Status:** done (#45)

**New scarf screen.** Spec: Appendix B8. Topic, grammar and tag picker with starter suggestions, a "N new / M already woven" preview, a tartan picker with search, and create.

- **Owns:** `src/ui/screens/NewScarf/**`

- **Depends on:** W1-H, W1-I, W1-J3, W1-K, W1-L

### W2-F

- **Status:** in progress (ccr-5f18eda6-7zvabx)

**Library screen.** Spec: Appendix B9. Searchable tartan library, swatches, detail view with provenance and the "pattern unverified" note.

- **Owns:** `src/ui/screens/Library/**`

- **Depends on:** W1-A, W1-H, W1-I

### W2-G

- **Status:** done (#48)

**Loom screen.** Spec: Appendix B6. Runs a session: exercises, accent keys, feedback, rating bar, a weave animation on learn, and the implicit-credit note.

- **Owns:** `src/ui/screens/Loom/**`

- **Depends on:** W1-L, W2-B

### W2-H

- **Status:** done (#49)

**Reweave and Tangles screens.** Spec: Appendix B7 and B11. Reweaving flow (moth flutters off on success) and the Tangles basket with focused practice.

- **Owns:** `src/ui/screens/Reweave/**`, `src/ui/screens/Tangles/**`

- **Depends on:** W1-L, W2-B


## Wave 3: integration and hardening
### W3-A

- **Status:** todo

**End-to-end slice test.** A Playwright journey: create a scarf, learn a batch, unlock a sentence, time-travel, see moths, reweave. Fix integration bugs in small PRs.

- **Owns:** `tests/e2e/slice.spec.ts` (fixes go in owner paths via separate PRs)

- **Depends on:** all of Wave 2

### W3-B

- **Status:** todo

**Content QA and flagging.** A "flag error" button that stores the flag locally and can export flags; first review pass over AI content.

- **Owns:** `src/ui/components/FlagButton*`, `content/**` review edits

- **Depends on:** W2-A, W2-G

### W3-C

- **Status:** todo

**Accessibility and polish audit.** Contrast in both themes, focus order, reduced motion, 44 px targets, `lang="gd"`, and text alternatives for canvases.

- **Owns:** fixes via small PRs in owner paths

- **Depends on:** all of Wave 2


### W2-E2

- **Status:** todo

**Pre-select a tartan from the Library.** The Library's "Use for a new scarf" goes to `/new?tartan=<id>`. The New scarf screen must read `tartan` from the query string and start with that tartan chosen (ignoring an unknown id).

- **Owns:** `src/ui/screens/NewScarf/**`, `tests/unit/screens/NewScarfScreen.test.tsx`

- **Depends on:** W2-E, W2-F

## Backlog (unscheduled)
Not part of any wave. Scheduled when the time is right.

### W-TARTAN-SOURCES

- **Status:** todo

**Tartan sett sources.** Settle which sources we may take thread counts from under our CC BY-SA 4.0 content licence (see `content/tartans/SOURCES.md`), then transcribe the setts W1-I needs: all available Ferguson variants, Murchison and MacKenzie-linked setts, and about 20 well-known clan tartans. Candidates: the public-domain 1893 *Old and Rare Scottish Tartans* (Project Gutenberg 70853), Logan 1831/1845, Wikipedia, or written permission from the Scottish Register of Tartans or another keeper. Needs `gutenberg.org` (and perhaps `en.wikipedia.org`) in the session's allowed hosts. Finishing it completes W1-I, and unblocks the tartan content for W2-E and W2-F.

- **Owns:** `content/tartans/**`

- **Depends on:** W1-H

### W-TARTAN-EXACT-SETTS

- **Status:** todo (needs W-TARTAN-SOURCES first)

**Replace the approximate setts with real ones.** The 26 files in `content/tartans/` are placeholders: the colours are right in spirit, but the stripe counts are not the real setts. Once W-TARTAN-SOURCES settles a usable source, replace each sett, set `provenance` to the real source, and flip `verified` only after checking against a keeper such as the Scottish Register of Tartans. Remove the "Approximate placeholder" wording as each one is replaced.

- **Owns:** `content/tartans/**`

- **Depends on:** W-TARTAN-SOURCES

## Parallelism at a glance
- **Wave 1 can run up to 15 sessions at once.** Code tasks own disjoint files, and data tasks own disjoint YAML folders.
- **Wave 2:**
  - W2-A, W2-C, W2-D, W2-E and W2-F can start as soon as their own dependencies merge.
  - W2-G and W2-H wait only on W2-B.
- **Critical path:** F1, then W1-D/W1-F/W1-K, then W2-B, then W2-G, then W3-A.

---

## Appendix A: content YAML format (contract for data tasks)
Data tasks can write YAML before W1-H lands. W1-H must accept exactly this shape.

```yaml
# content/lexemes/<file>.yaml
- id: lex:gaol            # kind prefix: lex: | form: | sent:
  gd: gaol
  en: love
  pos: noun               # noun|verb|adjective|adverb|preposition|pronoun|article|conjunction|particle|numeral|other
  gender: m               # optional, nouns only
  freqRank: 412           # optional
  tags: [topic:love, pos:noun]
  source: { ref: "Am Faclair Beag", licence: "see SOURCES.md", url: "https://..." }
  review: sourced         # sourced|generated|unreviewed|verified|flagged

# content/forms/<preposition>.yaml
- id: form:aig.1sg
  lexemeId: lex:aig
  gd: agam
  en: at me
  person: 1sg             # 1sg|2sg|3sg-m|3sg-f|1pl|2pl|3pl
  tags: [prep:aig, grammar:pronominal-preposition]
  source: { ref: "...", licence: "..." }
  review: sourced

# content/sentences/<topic>.yaml
- id: sent:love-001
  gd: Tha gaol agam ort.
  en: I love you.
  altGd: []
  tokens:
    - { text: Tha, itemId: lex:tha }
    - { text: gaol, itemId: lex:gaol }
    - { text: agam, itemId: form:aig.1sg }
    - { text: ort, itemId: form:air.2sg }
    - { text: ".", itemId: null }
  pattern: tha-N-aig-P-air-P
  tags: [topic:love, prep:aig, prep:air]
  isIdiom: false
  source: { ref: "AI draft, template love-01", licence: "CC BY-SA 4.0" }
  review: generated

# content/tartans/<id>.yaml
id: ferguson-old
name: Ferguson (Old)
clan: Ferguson
variant: Old
sett: "B/30 R4 G/34"
colours: { B: "#2c4084", R: "#c4202f", G: "#0b5a3a" }
scale: 0.55
provenance: { ref: "tartandictionary.org listing", url: "https://...", notes: "" }
verified: false

# content/topics.yaml
- { id: love, name: Love and feelings, tags: [topic:love, topic:feelings], starter: true }
```

**Tag namespaces:** `topic:*`, `prep:*`, `grammar:*`, `pos:*`, `level:*`. A new tag value is allowed, but its namespace must be one of these.

---

## Appendix B: UI specs (build from these, not from the mock-ups)
These specs were transcribed from `design/mockups/round2.html` (Cozy hearth). Every UI task must meet its spec exactly. A deviation needs a note in the PR and a line in `docs/LEARNINGS.md`. Where the mock-up showed nothing, the spec says **(no mock-up: tech-lead spec)**; those screens get a design check with the user after they are built.

Units are CSS px unless stated. All colours are Hearth tokens from `src/styles/tokens.css`: `--bg --surface --surface-2 --ink --muted --line --heather --amber --moss --rust --on-accent --moth`. Never use literal colours in components, except the fixed moth body `#5b4a3d`, the pupil `#1a1410`, the white eye, and the reweave thread `#e3b23c`.

### B1. Shared visual language
- **Base type:** body font `--font-body`, 15px inside screens, line-height 1.5. Display font `--font-display` for screen titles, scarf names, Gaelic prompts and big numbers.
- **Screen padding:** 18px top, 16px sides (respect safe-area insets), 12px bottom. Vertical rhythm is a 12px gap between blocks.
- **Screen title:** display, 1.45rem, weight 700. A subtitle sits under it as `<small>` in `--muted`.
- **Section label (`.lbl`):** uppercase, letter-spacing 0.12em, 0.66rem, weight 700, `--muted`.
- **Card:** `--surface` background, radius 14px, padding 12px, internal gap 8px, no border, no shadow.
- **Row:** flex, space-between, baseline-aligned, gap 8px.
- **Scarf name:** display, 1rem, 700. Sub-line (Gaelic tag words joined by ` · `): 0.78rem, `--muted`, `lang="gd"`.
- **Length:** weight 700, `font-variant-numeric: tabular-nums`, no wrapping. Format comes from `formatLength` (`src/domain/length.ts`), e.g. "2.4 ells".
- **Gaelic:** every Gaelic string is wrapped in an element with `lang="gd"`.
- **Touch targets:** at least 44px (`--tap`) for anything tappable.
- **Motion:** CSS transitions are 150-250ms ease-out. Under `prefers-reduced-motion` they are instant.

### B2. Weave visuals (W1-A)
- **Twill pixel rule:** at thread coordinates (x, y), show the warp colour when `((x + y) & 3) < 2`, else the weft colour.
- **Shading:** multiply the colour by 1.05 for warp and 0.93 for weft. Thread-edge pixels are multiplied by a further 0.86: the left and right pixel columns of a warp thread, and the top and bottom pixel rows of a weft thread. Noise multiplier is `1 + (hash(X, Y) - 0.5) * 0.09`. Then add 6 to each channel and clamp to 255. The hash is `h = (x*374761393 + y*668265263)|0; h = (h ^ (h>>>13)) * 1274126177; return ((h ^ (h>>>16))>>>0) / 4294967295` (port it exactly, so it is deterministic).
- **Thread size:** 2 device-independent px per thread on shelf strips and detail views; 3px on the reweave close-up and library swatches. The sett `scale` multiplies thread counts (minimum 1 per stripe).
- **Shelf strip:** height 44px, full card width. The cloth is inset 10px at each end for the fringe.
- **Fringe:** every 3px down the edge, draw a 1.6px round-capped line 8px long outward, alternating ±1px. Its colour is the sett thread at index `(i*2) % length`.
- **Vertical detail scarf:** canvas 64×380. The cloth spans x 4-60 and y 10-370, with the fringe top and bottom.
- **Item bands:** each woven item is one band. Band height is 9px on the detail view: one line of `rgba(255,255,255,.12)` 1px between bands. Kind weighting for length is in W2-B, not here.
- **Holes:** an irregular 12-point polygon. Each point is at radius `r*(0.75 + hash(seed+a, 7)*0.5)`. Fill with the card's `--surface`; stroke with `rgba(0,0,0,.25)` at 1px.
  - Strip radii: small 3.5, medium 5, large 7.
  - Detail radii: small 5, medium 6, large 8.
- **Moth beside the first (largest) hole:** size 22 on strips and 22 on the detail view. Place it at `x = cx + r + 13` and `y = max(13, cy - 4)`.
- **Moth sprite** (scale s):
  - Antennae: two quadratic curves from (±0.08s, -0.28s), control point (±0.2s, -0.55s), ending at (±0.32s, -0.52s). Line width is the larger of 1 and 0.05s, in the body colour.
  - Upper wings: ellipses at (±0.3s, -0.02s), radii 0.32s × 0.24s, rotated ∓0.5 rad.
  - Lower wings: ellipses at (±0.24s, 0.2s), radii 0.2s × 0.15s, rotated ±0.6 rad. Wings are filled `--moth`.
  - Body: ellipse 0.12s × 0.3s, `#5b4a3d`.
  - Eyes: white circles of radius 0.055s at (±0.06s, -0.2s). Pupils: radius 0.028s, `#1a1410`, at (±0.06s, -0.19s).
- **Text alternative:** "{name}, {length}, {n} moth hole(s)". Holes are rendered as focusable buttons over the canvas, labelled "Reweave {item gd}".
- **Shuttle animation** on weaving a new band: a 300ms sweep left to right across the new band. None under reduced motion.

### B3. UI kit (W1-L)
- **Button (primary):** inline-flex, centred, weight 700, 0.9rem, padding 9px 16px, pill radius, `--heather` background, `--on-accent` text, min-height 44px.
- **Button (ghost):** transparent background, `--heather` text, 1.5px solid `--heather` border.
- **Button row:** flex wrap, gap 8px.
- **Chip:** 0.72rem, weight 700, padding 2px 9px, pill radius, `--surface-2` background.
  - Variant `attention`: `--amber` text (moth holes).
  - Variant `calm`: `--heather` text (e.g. "resting").
- **TagPicker:** flex-wrap container with 6px gap. Each tag is a toggle button with `aria-pressed`, padding 5px 11px, pill radius, 1.5px `--line` border, 0.85rem. Selected tags get a `--heather` background and border, `--on-accent` text and weight 600. Use a ≥44px hit area (padding or `::after` expansion).
- **ProgressBar:** height 6px, radius 3px, `--surface-2` track, `--amber` fill. Expose `role="progressbar"` with values.
- **AccentKeys:** a row of five keys (à è ì ò ù), flex with equal widths and 6px gap. Each key: padding 6px 0, radius 8px, `--surface-2`, display font 1.1rem. Tapping inserts the character at the input's cursor and keeps focus in the input.
- **RatingBar:** a 3-column grid with 6px gap, buttons Hard / Good / Easy.
  - Each button: padding 9px 0, radius 10px, 1.5px `--line` border, weight 700, 0.9rem. Under the label sits a 0.7rem `--muted` hint: "sooner", "{interval}" (e.g. "4 days") and "later".
  - The selected or pre-selected button gets a `--moss` background and border with `--on-accent` text, and its hint turns `--on-accent` at 0.8 opacity.
  - `pre` selects one button: Good normally, Hard after an accent-only slip.
- **MothSprite:** an SVG or canvas rendering of the B2 moth for use outside the cloth, e.g. the reweave flight. It takes `size` and an optional `rotate`.
- **Card:** as in B1.

### B4. Shelf screen (W2-C)
- **Greeting:** display, 1.45rem, 700. Before 12:00 local time it reads "Madainn mhath!"; otherwise "Feasgar math!". Both are `lang="gd"`. **(Time-of-day switch: tech-lead spec; the mock-up showed only the morning.)**
- **Subtitle (small, `--muted`):**
  - "Good morning." or "Good afternoon." plus " {N} scarves have visitors." when N > 0.
  - When N is 1, use "1 scarf has visitors."
  - N is the number of scarves with at least one hole.
- **Label:** "Your shelf · {total} woven", where total is the sum of every scarf's length.
- **One card per scarf**, ordered by most recently worked:
  - The strip (B2).
  - A row: on the left, the name and sub-line; on the right, the length, with below it either a chip "{n} moth hole(s)" (attention) or a chip "resting" (calm) when there are no holes.
  - The whole card links to `/scarf/:id`.
- **Actions:**
  - Primary "Reweave {N} holes" only when N > 0 (it goes to the reweave of the scarf with the most holes).
  - Ghost "Start a new scarf" (`/new`).
- **Empty state:** the greeting, then a card reading "Your shelf is empty. Start your first scarf and the loom will show you how." with a primary "Start a new scarf" button.
- **Bottom nav:** see B10.

### B5. Scarf detail screen (W2-D)
- **Title:** the scarf name. Subtitle: "{tartan name} · begun {d MMM}".
- **Body:** a three-column grid of 64px, 26px and 1fr with a 10px gap.
  - **Column 1:** the vertical scarf (B2).
  - **Column 2:** the ruler, 380px tall, 0.68rem `--muted` tabular numbers. Labels at 0 and every 0.5 ell up to the total, plus the exact total. A label at value v sits at `top = 380 - v/total*370 - 5` px, vertically centred.
  - **Column 3:** facts at 0.88rem, gap 10px. Each fact has a big number (display, 1.6rem, 700, line-height 1.1) above its text:
    - "{length}", "ells woven"
    - "{count}", "items: {w} words, {f} forms, {s} sentences"
    - "{holes}", "moth holes waiting"
    - Then the scarf's tags as non-interactive tag chips (TagPicker style, unselected).
- **Actions:** primary "Weave new" (`/loom/:id`); ghost "Reweave {n}" (`/reweave/:id`) only when n > 0.
- Tapping a hole goes to `/reweave/:id` focused on that item.

### B6. Loom screen (W2-G)
- **Top line (small, `--muted`):**
  - Learning a new item: "{scarf name} · new item {i} of {batch}".
  - Reviewing: "{scarf name} · review {i} of {n}".
- **ProgressBar:** the session's progress.
- **Exercise card:**
  - Label by type: "Choose the meaning" (recognise), "Fill the gap" (cloze), "Type the Gaelic" (produce).
  - Prompt in display font, 1.3rem, line-height 1.3.
  - Recognise: three or four option buttons stacked with a 6px gap, padding 9px 12px, radius 10px, 1.5px `--line` border.
  - Cloze: the sentence with the blank as an underscored gap (2px `--heather` bottom border, 1.2em padding on each side), and options as TagPicker-style buttons in `lang="gd"`.
  - Produce: the input has a 1.5px border (`--line`, or `--amber` while feedback shows), radius 10px, padding 9px 11px, `--surface-2` background, display font 1.1rem, `lang="gd"`, autocapitalise off, spellcheck off. AccentKeys sit below it.
- **Feedback (0.85rem):**
  - Correct: `--moss`, "Math dhèanta! Well done."
  - Accent-only slip: `--amber`, "Almost: it's **{word}**, with a grave accent on the {letter}."
  - Wrong: `--rust`, "Not quite. It's **{answer}**." and the item is re-queued.
- **Rating:** after a correct review answer, show the label "How did that feel?" and the RatingBar (pre-selected Good, or Hard after an accent slip). No rating appears while learning a new item (the ladder handles it) or after a wrong answer (automatically Again).
- **Implicit-credit note:** after a typed full sentence, show at 0.82rem `--muted`: "Typing the full sentence also counts as a review for {list of Gaelic words}."
- **Weaving moment:** when an item is learned (2 correct answers), show the scarf strip with the shuttle animation adding its band, and the caption "Woven into {scarf}: +{fraction} ell".
- **Empty state** (`/loom` without a scarf): show "Choose a scarf to weave" and the shelf's scarf list as links.

### B7. Reweave screen (W2-H)
- **Top line (small, `--muted`):** "Reweaving · {scarf} · {i} of {n}".
- **Mend card:** a canvas 120px tall, full width.
  - Tartan at 3px threads.
  - The hole for the current item, r = 14, at x = 42% and y = 64.
  - A dashed thread (`#e3b23c`, width 2.5, dash 5/4) arcing over the hole from (x-22, 64) through control point (x, 40) to (x+26, 66).
  - On success, the hole closes over 400ms, and the moth (size 34) flies to (78%, 34), rotated 0.35 rad, with a white 0.7-alpha 1.5px trail. No animation under reduced motion.
- **Question card:** same patterns as Loom B6. In the recognise layout, the correct option shows a `--moss` border and text, weight 700, and a trailing "✓".
- **Status line (0.82rem, `--muted`):** "Math dhèanta! Well done. {k} hole(s) left." or, when finished, "All mended. The scarf is whole again."
- **Primary button:** "Next thread", or "Back to the shelf" at the end.
- **Tangled items** use the full learning ladder with hints instead of a single question. Mark them with the chip "tangled" (attention).

### B8. New scarf screen (W2-E)
- **Title:** "A new scarf".
- **Label "What would you like to talk about?":** a TagPicker of topic tags, starter topics first. Tapping a starter suggestion pre-selects its tags.
- **Label "Grammar":** a TagPicker of preposition and grammar tags, `lang="gd"`.
- **Preview card row:** "**{N}** new items" on the left and "{M} already woven elsewhere" (`--muted`) on the right. It updates live.
- **Label "Choose a tartan":**
  - A search box: 1.5px `--line` border, radius 10px, padding 8px 11px, 0.9rem, placeholder "Search clans and families: Ferguson, Murchison…". It filters by name, clan and variant.
  - Below it, a three-column grid of swatches with 8px gap. Each swatch is a canvas 54px tall, radius 8px, with a 2px border (transparent, or `--heather` when selected). Its label is centred at 0.72rem.
  - Show the first 9 results, then "Show more".
- **Primary "Set up the loom":** disabled until at least one tag and a tartan are chosen. It creates the scarf and goes to `/loom/:id`.
- **Name field (no mock-up: tech-lead spec):** an optional text input above the button, defaulting to the starter name or the selected topic names joined with " and ".

### B9. Library screen (W2-F) (no mock-up for this screen: tech-lead spec based on the round 1 library cards)
- **Title:** "Tartan library". Subtitle: "{count} setts".
- **Search box:** as in B8.
- **Grid:** `repeat(auto-fill, minmax(160px, 1fr))` with 12px gap.
- **Card:** `--surface`, radius 14px, overflow hidden.
  - Swatch: 110px tall, 3px threads.
  - Body: padding 10px 12px. The name in display font, then the sett code at 0.75rem `--muted` with `overflow-wrap: anywhere`, then the clan and variant at 0.8rem.
  - If unverified, a small "pattern unverified" chip (calm).
- **Detail view:** tap a card for a large swatch (220px), the full sett, a colour key (swatch dots with codes), the provenance link and notes, and the button "Use for a new scarf", which goes to `/new` with that tartan pre-selected.

### B10. Bottom navigation (F1, already built)
- The mock-up shows four items (Shelf, Loom, Tangles, Library). F1 adds **Settings** as a fifth item, because the theme override needs a home (approved by the user).
- Layout: a grid of equal columns with a 1px `--line` top border and 6px padding, on `--surface`. Each item is ≥44px tall, has an 18px rounded-square icon placeholder (radius 6, current colour, 0.35 opacity) and a 0.75rem label.
- Active item: `--heather`, weight 700, icon at full opacity.
- Real icons are a later design task (B11).

### B11. Tangles screen (W2-H) (no mock-up: tech-lead spec)
- **Title:** "Tangles". Subtitle: "Threads that need a little more practice."
- **List of cards**, one per tangled item:
  - A row: the Gaelic in display font at 1.1rem on the left, the English in `--muted` beneath it, and the owning scarf name as a calm chip on the right.
- **Primary "Untangle {n}":** runs a learning-ladder session over all tangled items.
- **Empty state:** "No tangles. Every thread is running smoothly."
