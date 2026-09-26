# F33 — `build:ifstale` ignores tests and snapshots

## .fork

`build:ifstale` rebuilt `dist/` whenever any file under `src/` was newer than the stamp. a test
edit or a resnap triggered a full build before every acceptance run.

| option | |
|---|---|
| a. keep the broad check | a build per test edit |
| b. exclude `*.test.ts` and `*.snap` | tests never ship in `dist/`, so they cannot stale it |

## .verdict — TAKEN, 90%, rework clean

(b). `tsconfig.build.json` already excludes tests, so the exclusion mirrors what the build reads.

## .why the confidence is not higher

a test asset that is not `*.test.ts` (for example a fixture under `src/.test/`) still triggers a
build. that is a missed skip, never a stale dist.

## .rework

clean: one `find` expression in `package.json`.

## .where

- `package.json` `build:ifstale`
