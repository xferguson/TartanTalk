# Tartan sources: still to be settled

**There are no setts in `content/tartans/` yet, on purpose.** A first pass transcribed 16 setts from Tartan Dictionary, whose licence is unstated and whose upstream data includes a CC BY-NC-ND 4.0 database. That does not fit our CC BY-SA 4.0 content licence, so those files were removed before merge. Their thread counts are not kept anywhere in this repo.

We still need a list of sources we can use. The follow-up task is `W-TARTAN-SOURCES` in `docs/WORKPLAN.md` (Backlog). It is not part of this wave or the next; we will schedule it when the time is right.

## What has been checked
| Source | Finding |
|---|---|
| Scottish Register of Tartans (`tartanregister.gov.uk`) | Text and images are Crown copyright, free to re-use with acknowledgement. Thread counts are shown only to logged-in users, so they could not be read. Its sign-up and terms need checking before any count is taken from it. |
| Tartan Dictionary (`tartandictionary.org`) | No licence stated. Upstream chain includes CC BY-NC-ND 4.0. Not usable as a data source. |
| *Old and Rare Scottish Tartans* (1893), Project Gutenberg, ebook 70853 | Public domain. Not yet read, because the session network did not resolve `gutenberg.org`. Worth reading for which clans it covers. |
| Logan, *The Clans of the Scottish Highlands* (1845-47) | Public domain. Page images on HathiTrust. Not yet read. |
| Wikipedia / Wikimedia Commons | CC BY-SA, so compatible. The session network did not resolve `en.wikipedia.org`. Unknown whether its sett data is complete or sourced. |

## What the content needs
- All available Ferguson variants, and Murchison and MacKenzie-linked setts. The content pipeline requires Ferguson and Murchison once any tartan exists.
- About 20 well-known clan tartans.
- Each sett needs honest `verified` and `provenance` fields (see `content/README.md`).

Until then the pipeline prints "No tartans yet" and skips the required-clan check.
