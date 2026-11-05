# F11 — concerns on extant lines of `genCloneSocketServer.integration.test.ts` are out of scope

## .the fork

the i004 ergo-friction-hazards review raised a blocker (no message snapshots on cases 2/5/7/8/9/11)
and four nitpicks (caps in cases 1–11, cleanup after assertions in cases 4–8, a duplicate `[t0]` in
case10, contradictory write-granularity comments in cases 1/3/11), all on lines 43–525 of the server
suite.

fix them here, or hold them as out of scope.

## .taken

hold them. this PR adds only `[case19]` to that file:

- `git diff --stat HEAD -- src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts`
  → `71 ++++` (insertions only, all case19 + its imports)
- the review diffs `since-main`, and the local `main` ref sits at `c512891a` (v1.47.3) while the
  branch is cut from `origin/main` `6e26ecac` (v1.50.1). every line those releases added reads to the
  reviewer as this PR's — cases 1–11 among them
- a rewrite of another PR's eleven cases is the refactor `rule.prefer.scouts-honor` holds out of an
  unrelated change

the review tool's stale base ref is caught as dream
`v2026_11_01.reseed.review-since-main-reads-stale-local-main.md`.

## .rework

clean. each concern is local to an extant case; any can land in its own PR.

## .confidence

92% — the diff stat is a measurement. the residual is whether a reviewer wants the message snapshots
regardless of authorship.

## .where

- `src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts` lines 43–525
