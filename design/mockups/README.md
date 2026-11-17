# Design mock-ups

`body.html` is the source for design round 1: palette directions, icon concepts and the tartan setts used. It is published as a claude.ai artifact and also served by GitHub Pages at `/TartanTalk/mockups/`.

`public/mockups/index.html` is generated from it. Regenerate after editing:

```sh
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'; cat design/mockups/body.html; printf '\n</body>\n</html>\n'; } > public/mockups/index.html
```

The twill renderer here is a prototype for M1 (`src/weave`). Sett thread counts are for mock-ups only and still need provenance and licence checks.
