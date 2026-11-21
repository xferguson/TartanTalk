---
name: research-sources
description: Rules for researching data for Tartan Talk content (tartan setts, Gaelic vocabulary, sentences, audio). Which hosts work with which tool in cloud sessions, which sources are usable under our CC BY-SA 4.0 content licence, and how to record provenance. Use before any data or research task, such as W1-I, W1-J1 to J3, W1-M, W2-A or W-TARTAN-SOURCES.
---

# Research sources (Tartan Talk)

Content in `content/` is CC BY-SA 4.0 and the app is free and open source. Data we cannot re-license that way must not go in. These notes come from W1-I (#29). Update this file when you learn something new about a source.

## 1. Check the licence before you copy
- Find the source's **licence and its upstream chain** first. A site with no licence statement is "all rights reserved" until shown otherwise.
- Compatible: public domain (published before about 1900, or marked so), CC0, CC BY, CC BY-SA, Crown copyright with a free re-use statement and acknowledgement.
- Not compatible: any `NC` or `ND` licence, "personal use only", or terms that forbid copying or scraping.
- Short facts (a single thread count, a word's meaning) are not copyrightable on their own, but a **database compiled from an NC/ND source is still a risk**. Do not bulk-copy from one.
- If unsure, do not add the data. Write it down as a follow-up and ask the user.

## 2. Hosts and tools (cloud sessions)
The session network is an allowlist. A host that fails with `getaddrinfo ENOTFOUND` is blocked, not missing.
- Use **WebFetch** for reading pages. It reached `tartandictionary.org` and `tartanregister.gov.uk` when `curl` did not. Its answers are summarised by a small model, so **stripe codes and numbers can be garbled**. Never mark data `verified: true` from a WebFetch summary.
- `curl` to non-allowlisted hosts is refused. Do not work around it.
- Blocked when last tried: `en.wikipedia.org`, `commons.wikimedia.org`, `gutenberg.org` (added to the allowlist in #29 but still failing), `tartansauthority.com`. The Gaelic content expansion also found `www.faclair.com`, `learngaelic.scot`, `tatoeba.org`, `downloads.tatoeba.org`, `www.dasg.ac.uk`, `en.wiktionary.org`, `dumps.wikimedia.org` and `opus.nlpl.eu` refused by the proxy (HTTP 403). Ask the user to allow a host, with the reason, rather than trying others.
- **Works with `curl`:** `raw.githubusercontent.com`, so openly licensed data kept on GitHub can be downloaded directly, with exact numbers and no summarising.
- If a host is blocked, say so in your report and carry on with what does not need it. Do not invent data to fill the gap.

## 3. Known sources
| Source | Terms | Notes |
|---|---|---|
| Scottish Register of Tartans, `tartanregister.gov.uk` | Crown copyright. Text and images free to re-use with acknowledgement and the source named. | Thread counts are shown only after login. Check its terms for logged-in data before using any. |
| Tartan Dictionary, `tartandictionary.org` | No licence stated. Its upstream chain includes `thetartan/tartan-database`, CC BY-NC-ND 4.0. | **Do not use as a data source.** Fine as a pointer to find a name. |
| *Old and Rare Scottish Tartans* (1893), Project Gutenberg 70853 | Public domain. | Not yet read. |
| Logan, *The Clans of the Scottish Highlands* (1845-47) | Public domain. Page images on HathiTrust. | Not yet read. |
| UD Scottish Gaelic treebank (ARCOSG), `github.com/UniversalDependencies/UD_Scottish_Gaelic-ARCOSG` | CC BY-SA 4.0. | About 84,000 lemmatised tokens. Used for `freqRank` (method in `content/SOURCES.md`, "Frequency ranks"). Its sentences are real CC BY-SA Gaelic, but long and full of words we don't have. |
| Nicolson, *A Collection of Gaelic Proverbs and Familiar Phrases* (1881) | Public domain. | Not reachable yet. Check the traditional proverbs in `content/sentences/proverbs.yaml` against it. |

## 4. Record provenance
- Every record carries `source` or `provenance` with a `ref`, a `url` where there is one, and notes on the licence. Set `verified` and `review` honestly.
- Add the source and its licence to the relevant `SOURCES.md` (`content/SOURCES.md`, `content/tartans/SOURCES.md`).
- After changing anything under `content/`, run `npm run content` and commit the regenerated `src/content/generated/` (CI fails otherwise).
