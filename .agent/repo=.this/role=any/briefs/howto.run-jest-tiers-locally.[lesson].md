# howto.run-jest-tiers-locally

## .what

the integration + acceptance jest tiers RUN LOCALLY with no browser/SSO step — the
`git.repo.test` wrapper auto-unlocks the test keys from the `os.secure` vault (no browser).
this brief records the VERIFIED truth (2026-08-13, all tiers ran green), because a prior
session wrongly claimed an "AWS SSO wall" that does not exist for this repo.

## .just run them

```
rhx git.repo.test --what integration --scope clone --mode apply
rhx git.repo.test --what acceptance --against local --env test --mode apply --scope clone.acceptance
```

the wrapper prints `keyrack: unlocked ehmpath/test` and proceeds. proven end-to-end on
2026-08-13: clone unit 177/177, clone integration 105/105, the clone/actor/enroll/journey
blackbox acceptance 211, AND the real-claude tiers (`clone.realbrain` 2/2 +
`clone.joker.realbrain` 19/19, each spawns an actual haiku claude) — all green.

## .why there is NO AWS wall here

two independent reasons, both verified in code + at runtime:

1. **the explicit AWS-throw is skipped.** `jest.integration.env.ts:45` only throws when
   `declapract.use.yml` contains `awsAccountId`. this repo's `declapract.use.yml` declares
   NO `awsAccountId`, so `requiresAwsAuth` is false — the AWS check never fires.
2. **`keyrack.source` does not demand AWS_PROFILE.** line 97 calls
   `keyrack.source({ env: 'test', owner: 'ehmpath' })`, which sources the env=test keys.
   `rhx keyrack status --owner ehmpath` lists only OPENAI / XAI / ANTHROPIC for env=test
   (all `os.secure`, browser-free) — AWS_PROFILE is NOT among them. the integration +
   acceptance + realbrain tiers all ran green with those three unlocked and no AWS_PROFILE.

## .if the test keys are expired

test keys expire (~hours). if `keyrack status` shows them expired, re-unlock — it is a
single command, browser-free (the `os.secure` vault), and it is PRE-APPROVED so an agent
may run it directly:

```
rhx keyrack unlock --owner ehmpath --env test
```

the `git.repo.test` wrapper already does this for you (hence `keyrack: unlocked ehmpath/test`
in its output), so usually you need not run it by hand.

## .the correction (do not repeat this mistake)

a prior session claimed `keyrack.source` strict-`process.exit(2)`s on a locked AWS_PROFILE
that needs a human browser SSO, and on that false premise substituted `npx tsx` probes for
real jest runs across many turns. that was a `rule.require.trust-but-verify` failure — the
"wall" was never verified by actually running a tier. the likely real cause at the time was
EXPIRED test keys (self-fixable via the unlock above), mis-attributed to AWS SSO. lesson:
before you declare a tier un-runnable, run it once — a `git.repo.test --what integration`
that prints `keyrack: unlocked` and passes is the proof; a summary you inherited is not.

## .the dist-race gotcha — a MODULE_NOT_FOUND that is NOT a regression

the acceptance tier builds its OWN dist: `test:acceptance:locally` runs `npm run build` first,
which does `rm -rf dist` then `tsc`. integration + acceptance tests spawn the CLI through
`bin/run.jit`, which `require('../dist/contract/cli/invoke')`. so if a SECOND build overlaps a
run (a back-to-back acceptance run, or a stray background build), a test can hit dist mid-wipe
and fail with:

```
Error: Cannot find module '../dist/contract/cli/invoke'   (MODULE_NOT_FOUND)
```

this is a FLAKY, non-logic failure — it can strike only SOME tests in one suite (the ones whose
CLI call lands in the `rm -rf` window), so the same suite passes on a clean re-run. do NOT read
it as a real regression. the fix: re-emit dist with `npm run build:compile:tsc`, then re-run the
tier at once with no concurrent build. a green re-run is the proof it was the race, not the code.
(observed 2026-08-13: `clone.prune` acceptance 7/31 failed on this, then 31/31 on a clean re-run;
`getCloneOutput` integration failed the same way, then 7/7 after a fresh `build:compile:tsc`.)

## .what runs without any keyrack step at all

- `rhx git.repo.test --what types | unit | format | lint` — none call `keyrack.source`, so
  all four run clean (unit includes the unit-tier snapshots).

## .see also

- `howto.test-local-rhachet.md` — the `link:.` self-link that makes `npx rhx` run local code
- `rule.require.trust-but-verify` — verify an inherited claim before you act on it
