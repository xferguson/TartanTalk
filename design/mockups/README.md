# Design mock-ups

`body.html` is the source for design round 1: palette directions, icon concepts and the tartan setts used. It is published as a claude.ai artifact and also served by GitHub Pages at `/TartanTalk/mockups/`.

`public/mockups/index.html` is generated from it. Regenerate after editing:

```sh
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'; cat design/mockups/body.html; printf '\n</body>\n</html>\n'; } > public/mockups/index.html
```

The twill renderer here is a prototype for M1 (`src/weave`). Sett thread counts are for mock-ups only and still need provenance and licence checks.

## Rounds
- Round 1 (`body.html`, Pages `/mockups/`): four palette directions and nine icon concepts.
- Round 2 (`round2.html`, Pages `/mockups/round2/`): the chosen Cozy hearth direction with Daylight and Peat fire themes, five screens, and tartan speech-bubble icon variants A to F. Regenerate its copy the same way, writing to `public/mockups/round2/index.html`.

## App icon
Chosen: variant A "Classic" (tartan speech bubble, Ferguson (Old) on undyed wool). Source: `design/icon/icon.html`. Regenerate the PNGs in `public/icons/` with `npm run icons`.
