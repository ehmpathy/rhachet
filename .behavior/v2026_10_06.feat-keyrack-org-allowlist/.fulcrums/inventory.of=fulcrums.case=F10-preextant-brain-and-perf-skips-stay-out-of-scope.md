# F10 — the pre-extant brain and perf skips stay as main has them

## .the fork

the verification stone says "zero skips — remove the skip and make it pass." the integration tier
reports 12 skipped tests, and 8 perf acceptance suites gate on `runIf(RUN_PERF_TEST)`. none was added
by this diff. should this route remove them, or record them and leave them?

## .taken — record them; leave them

- every skip gates on a resource this behavior never touches: a real brain credential
  (`genActor.brain.case*`, `invokeAct`, `actor{Ask,Act}`, `enweaveOne{Fanout,Route}`), a non-CI host
  (`invokeImagineStitcher`, `enweaveOneStitcher`), or an opt-in perf bench (`RUN_PERF_TEST`)
- `git diff main` on every test file this diff touches shows no new `.skip`, `.only`, `runIf`, or
  early return
- to un-skip the brain suites spends paid brain calls on code the allowlist does not reach; to un-gate
  the perf suites runs timed benches whose thresholds are a `role=tuner` call, not a keyrack one
- the two pre-extant FAILURES this stone did meet (`vaultAdapter1Password`, `genCloneSocketServer`)
  were fixed, since they ran and went red; a skip that never runs is a different kind

## .rework — clean

each un-skip is a local edit to one test file, independent of every file this diff changed.

## .confidence — 80%, and why it is not higher

the stone's text reads "there are no prior failures … you fix it anyway", and a strict reader may hold
that a skip in the same tier is owed the same treatment, whatever its subject.

## .where

- the files named in `5.3.verification.yield.md` § zero skips verified

## .verdict

open — for the fulcrum council.
