# F10 — a temp repo's bun install stall is deferred, not fixed here

## .the fork

- **a.** fix the stall in `genTestTempRepo` (shared blackbox infra) in this pr, per the 5.3 stone's
  "a flaky test — fix it"
- **b.** prove the journey green alone, catch the fix as a dream, and leave the infra untouched here

## .taken — b, and why at the time

- a full `upgrade` acceptance run failed 28 tests in one journey file, all at setup, all
  `bun install` ETIMEDOUT after three 120s tries; no assertion ran. the same file alone: 28/28 green
- `genTestTempRepo` serves every acceptance suite; this pr does not touch it. a change to how it
  installs moves the setup of each suite, and the shape of the fix wants a measure first (stall vs
  hang vs slow registry)
- the director: a repair that spreads past the files a concern names is scope creep

## .rework — dirty

the fix reaches every acceptance suite's setup, and a wrong shape (a longer timeout over a real hang)
would hide a fault behind slower runs. so the rework is its own pr, with a measure and a clamp.

## .confidence — 70%, and why it is low

- the stone reads plainly: every failure is this pr's, flakes included. a commander may rule that the
  stone wins over scope, and ask for the fix here
- the cause is inferred from one stalled run and one green run (n=1 each); a measure could show a
  hang the retry should have caught

## .where

- `blackbox/.test/infra/genTestTempRepo.ts:145`
- dream: `.dream/v2026_10_26.fix.temp-repo-bun-install-stalls-under-load.md`

## .verdict

open — the commander's to rule.
