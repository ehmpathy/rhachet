# howto.run-jest-tiers-locally

## .what

`types` · `unit` · `format` · `lint` run locally with no credential step at all.

`integration` · `acceptance` reach the keyrack, and the `git.repo.test` wrapper auto-unlocks the
test keys from the `os.secure` vault — browser-free. but the wrapper ALSO demands `AWS_PROFILE`,
which this host rack does not hold, so those two tiers exit 1 on an interactive SSO prompt.

⇒ the full integration + acceptance sweep routes to **cicd**, which holds its own credentials.

## 🔴 .the AWS wall — an `env.all` arrives by extends

the requirement is in the extended role manifests, never in this repo's test code:

```yaml
# .agent/repo=ghlitch/role=observer/keyrack.yml — and role=operator, identically
env.all:
  - key: AWS_PROFILE
    is-optional-if-has: AWS_ACCESS_KEY_ID
```

`.agent/keyrack.yml` extends both roles, and **`env.all` applies to EVERY env, test among them**.
the key is optional only where `AWS_ACCESS_KEY_ID` is present; absent that, the unlock falls through
to an interactive browser SSO and the tier exits 1:

```
└─ ehmpathy.test.AWS_PROFILE
   ├─ status: errored 💥
   └─ aws sso login timed out: human did not respond to browser sso prompt
```

🟡 **the jest tier itself never asks for AWS.** `jest.integration.env.ts:45` throws only when
`declapract.use.yml` declares `awsAccountId`, and this repo's does not — so `requiresAwsAuth` is
false and that check never fires. the wall is entirely in the keyrack wrapper ahead of it.

### .how to tell this apart from expired keys, in one command

```
rhx keyrack status --owner ehmpath
```

- every env=test key shows minutes left, and **AWS_PROFILE is not listed at all** → this wall. the
  keys are fine; the requirement arrives by extends and has no host entry
- an env=test key shows expired → the ordinary case, self-fixable by the unlock below

⇒ measured 2026-09-18: OPENAI / XAI / ANTHROPIC / FIREWORKS all at 536m, no AWS_PROFILE row, and
`--what integration` still exited 1 on it.

### 🔴 .the durable lesson — a requirement can arrive from a manifest this repo never edited

and `grepsafe` cannot settle it: it reports one `AWS_PROFILE` hit, in `env.prep`, because the
extended manifests are symlinks into `node_modules` that neither it nor `Glob` follows
(`rule.forbid.grepsafe-path-globs`). **read each `extends` target by path.**

⇒ the repair of the extends is `.dream/2026_09_17.git-repo-test-unlocks-credentials-the-tier-never-uses.dream.md`
— it carries the `is-optional-if-has` host clause and three candidate repairs.
`rule.forbid.local-full-test-sweeps` already names cicd as the sanctioned place for a full sweep, so
the wall costs a local convenience rather than a verification.

## .the commands

```
rhx git.repo.test --what types
rhx git.repo.test --what unit --mode apply
rhx git.repo.test --what format
rhx git.repo.test --what lint

rhx git.repo.test --what integration --scope clone --mode apply
rhx git.repo.test --what acceptance --against local --env test --mode apply --scope clone.acceptance
```

the first four run clean under the wall. the last two exit 1 on it unless the host rack holds
`AWS_PROFILE` or `AWS_ACCESS_KEY_ID`.

⚠️ **`npx rhx` run by hand bypasses the wrapper entirely**, so live clone dogfood is unaffected — an
`enroll` + `clone say` against a real brain works while this wall holds.

⇒ the tiers themselves are sound: on 2026-08-13, before those role manifests were extended, clone
unit 177/177, clone integration 105/105, the clone/actor/enroll/journey blackbox acceptance 211, and
the real-claude tiers (`clone.realbrain` 2/2, `clone.joker.realbrain` 19/19, each spawns an actual
haiku claude) all ran green locally.

## .if the test keys are expired

test keys expire (~hours). the unlock is a single command, browser-free (the `os.secure` vault), and
**PRE-APPROVED** so an agent may run it directly:

```
rhx keyrack unlock --owner ehmpath --env test
```

the `git.repo.test` wrapper already does this for you (hence `keyrack: unlocked ehmpath/test` in its
output), so usually you need not run it by hand.

## .the dist-race gotcha — a MODULE_NOT_FOUND that is NOT a regression

the acceptance tier builds its OWN dist: `test:acceptance:locally` runs `npm run build` first, which
does `rm -rf dist` then `tsc`. integration + acceptance tests spawn the CLI through `bin/run.jit`,
which `require('../dist/contract/cli/invoke')`. so a SECOND build that overlaps a run (a back-to-back
acceptance run, or a stray background build) lets a test hit dist mid-wipe:

```
Error: Cannot find module '../dist/contract/cli/invoke'   (MODULE_NOT_FOUND)
```

this is FLAKY and non-logic — it strikes only the tests whose CLI call lands in the `rm -rf` window,
so the same suite passes on a clean re-run. do NOT read it as a real regression. the fix: re-emit
dist with `npm run build:compile:tsc`, then re-run the tier at once with no concurrent build. a green
re-run is the proof it was the race.

⇒ observed 2026-08-13: `clone.prune` acceptance 7/31 failed on this, then 31/31 on a clean re-run;
`getCloneOutput` integration failed the same way, then 7/7 after a fresh `build:compile:tsc`.

## 🔴 .before you declare a tier un-runnable, run it once

a `git.repo.test --what integration` that prints `keyrack: unlocked` and passes is the proof. a
summary you inherited is not, and neither is a probe you substituted for the tier
(`rule.require.trust-but-verify`).

## .see also

- `howto.test-local-rhachet.md` — the `link:.` self-link that makes `npx rhx` run local code
- `rule.require.trust-but-verify` — verify an inherited claim before you act on it
- `rule.forbid.local-full-test-sweeps` — cicd is the sanctioned place for a full sweep
- `rule.forbid.grepsafe-path-globs` — why a grep cannot settle an `extends` question
