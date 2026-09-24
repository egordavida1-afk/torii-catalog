# TORII v14.5

## Catalog and providers
- TMDB is removed from the active application/runtime. There are no TMDB API calls or `TMDB_ACCESS_TOKEN` configuration entries.
- Catalog synchronization now runs through Kodik only for the current provider flow.
- Legacy database rows that were created in older versions remain untouched; no destructive data migration was added.
- Kodik import now accepts direct `poster_url` / `anime_poster_url` fields when present and falls back through material data and screenshots.
- Kodik source links now fall back to the first season/episode link when the top-level link is absent, improving player availability for serials.
- Fixed the TypeScript inference error in the paginated Kodik loader by explicitly typing the response.

## Watch progress
- Keeps the v14.4 watch-progress migration and server-action build fix.

## AnimeParsers note
- The `anime-parsers-ru` / AnimeParsers project was reviewed as a possible future multi-source anime adapter.
- It is a Python package (Python 3.10+) rather than a Node/npm package, so it is not wired directly into the Next.js runtime in this release. A separate Python API/worker is the safer integration boundary for a later source test.

## Admin
- The admin sync screen no longer references TMDB.
- Manual edits normalize legacy external-source rows back to the current Kodik/manual model.
