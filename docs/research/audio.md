# Audio research (W1-M)

**Question:** can Tartan Talk ship audio for Gaelic words and sentences on day one? The PRD says "try for day one; defer if quality is poor".

**Recommendation: NO-GO for day-one audio.** Ship text-only. Keep `audio?` optional on lexemes and sentences (already in `TECH_PLAN.md`) so audio can be added later without a migration. Revisit when one of the "triggers to revisit" below happens.

## How this was researched, and its limits
Only web search snippets were available. Direct fetches failed because these hosts are outside the session's network policy: `www.isca-archive.org`, `learn.microsoft.com`, `docs.cloud.google.com`, `commonvoice.mozilla.org`. **Every claim below is unverified until someone checks the primary source.** The "Verify" column lists the page to check. This is the same problem as learning L5.

## Findings

### 1. Open recorded audio
| Source | What we found | Licence | Verify |
|---|---|---|---|
| Mozilla Common Voice | No Scottish Gaelic dataset turned up. Irish, Welsh and Manx do have datasets. A (undated, unofficial) forum post said Scottish Gaelic is not in Common Voice. | Common Voice is CC0 in general | `commonvoice.mozilla.org/en/languages`, and its GitHub language-request process |
| Lingua Libre / Wikimedia Commons | Community tool that uploads word recordings to Commons. We could not confirm any Scottish Gaelic recordings or how many. | CC BY-SA 4.0 (the tool's licence; check each file). Share-alike would apply to audio only, not to app code, but must be attributed | Commons category for Scottish Gaelic pronunciations |
| Tatoeba | Sentence counts and audio for Scottish Gaelic (`gla`) not found. | CC BY 2.0 FR for sentences, per-file for audio (from memory, unverified) | `tatoeba.org` stats page for `gla` |
| LearnGaelic (Faclair, about 70,000 sound files) | Large recorded set, but nothing says it is openly licensed. Must be assumed all rights reserved. | Unknown, assume restricted | LearnGaelic terms page. Could ask them for permission |
| Am Faclair Beag | Dictionary only. No audio licence information found. | Unknown | Site terms |
| ÈIST / Edinburgh ASR research | Papers mention Gaelic speech sets (e.g. 103 h, 40 h of BBC Radio nan Gàidheal transcribed speech) but not that they are open. The authors said a large open Gaelic speech dataset is needed. Broadcast speech is not word-level audio either. | Not shown to be open | Edinburgh Gaelic Research Group publications |

**Conclusion:** no source found that is both openly licensed and covers our word and sentence lists. Even if Lingua Libre has some, coverage of about 400 slice items is unlikely to be complete, and recordings with mixed speakers and quality would sound uneven.

### 2. Text to speech (TTS)
| Option | Findings | Licence / terms | Verify |
|---|---|---|---|
| CereProc "Ceitidh" (made with CALL Scotland, 2015) | The only Scottish Gaelic neural voice confirmed in results. Free for Scottish public-sector schools, NHS and government through CALL. | **Not open.** Free use is for the public sector. We found no right to bundle or redistribute audio in a public open-source PWA. Would need written permission | CALL Scotland and CereProc licensing; `ceitidh.storlann.co.uk` |
| Azure Speech | Gaelic (gd-GB) support not confirmed. Irish (Colm voice) exists, so it is possible. | Commercial, per-character. Needs a key, so cannot run in a local-only, no-account app. Pre-generated audio would need terms checked | Azure language support table |
| Google Cloud TTS | Gaelic support not confirmed. | Commercial, same concerns | Cloud TTS voices list |
| Browser `speechSynthesis` | No Scottish Gaelic voice expected on most devices; it would read Gaelic with English rules. Not verified. | n/a | Test on Android, iOS, desktop |
| Research voice (Interspeech 2023, "wells23") | Low-resource Gaelic TTS built from learner recordings. Not shown to be released. | Unknown | Paper and authors |
| Self-trained open model | Would need an open Gaelic corpus, which we do not have. | n/a | n/a |

**Conclusion:** the one good voice is not ours to ship, and the others are unconfirmed, key-gated, or unavailable. Wrong Gaelic pronunciation is worse than none for a learner, and the PRD sets the bar at "defer if quality is poor".

## Fit with product principles
- Local-only data, no accounts: rules out any runtime TTS API.
- Free and open source: rules out audio we cannot relicense. CC BY-SA audio is acceptable if attributed, and kept separate from the MIT code. Content is already CC BY-SA 4.0, so it fits.
- Offline PWA: bundled audio adds size. About 400 items at roughly 8 kB each would be about 3 MB; fine, if we had it.

## Triggers to revisit
1. Permission obtained from CALL Scotland / CereProc, or LearnGaelic, for redistribution.
2. A Scottish Gaelic Common Voice dataset reaches useful size (we could request the language).
3. A verified check shows enough CC-licensed Lingua Libre or Tatoeba recordings for the starter vocabulary.
4. A native speaker offers to record the slice vocabulary under CC BY-SA 4.0. This is the most realistic route and also the best quality. About 400 short clips is a few hours of work.

## Suggested next steps (not part of this task)
- Add a content-pipeline note (W1-H) that `audio` is optional and a file path, so nothing blocks on it.
- Add a Wave 3 or later task: "Audio: contact and recording drive", owned by whoever runs community outreach.
- Someone with unrestricted network should verify the "Verify" column and update this file.
