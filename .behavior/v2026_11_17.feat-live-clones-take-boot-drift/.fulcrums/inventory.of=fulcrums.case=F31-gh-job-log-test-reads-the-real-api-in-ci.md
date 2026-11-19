# F31 · the show.gh.job.log integration reads the real gh api in ci

## .the fork

- **a.** the test reads a real run and job of this repo via gh; ci grants the integration steps a
  read-only `GH_TOKEN: ${{ github.token }}`, and every workflow on the test path adds `actions: read`
- **b.** stub gh with a fake binary on PATH, so ci needs no token
- **c.** move the skill out of this pr

## .taken = a

- the skill exists to read a real job log and strip its escapes; a stub proves only the stub, which
  `rule.require.external-contract-integration-tests` and `rule.forbid.integration.mocks` forbid
- `github.token` is minted per run, scoped to this repo, and `actions: read` is read only; no secret
  is added, and no write scope moves
- the run is found live (`gh run list --workflow test --status completed`), so no id expires with
  gh's log retention

## .rework = clean

revert the three `actions: read` lines and the two `GH_TOKEN` env blocks; the test then fails fast
with a ConstraintError that names the fix, never a silent skip.

## .confidence = 75%, why

a declapract upgrade may rewrite `.github/workflows/*.yml` and drop the grant; the test would then
fail loud in ci, which is the cue, not a silent gap.

## .where

`.github/workflows/{test,publish,.test}.yml`,
`.agent/repo=.this/role=any/skills/show.gh.job.log.integration.test.ts`. answers r3.blocker.1 (5.3, i001).

## .verdict

owed — a council rules at the close.
