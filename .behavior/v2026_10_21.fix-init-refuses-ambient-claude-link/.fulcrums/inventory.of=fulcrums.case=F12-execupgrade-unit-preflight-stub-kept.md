# F12 — the `execUpgrade.test.ts` unit suite keeps a stub of the preflight

## .the fork

- **a.** remove the new `jest.mock` of `assertRepoActorBrainDirReadyForRoleInits` from the unit suite:
  inject the preflight through `execUpgrade`'s contract, or move the suite to integration
- **b.** keep the stub, one more of the suite's eleven, and clamp the real preflight in its own
  integration suites and through the real binary in `upgrade.acceptance` [case18]

## .taken — b, and why at the time

- the real preflight writes a probe file into the repo actor brain dir; the suite's gitroot is the
  fake path `/test`, so an unstubbed run throws `ENOENT` on the first upgrade case
- (a) by injection changes `execUpgrade`'s signature (a third arg, or a new `ContextCli` field) —
  prod code past the file the concern names; (a) by a move rewrites an extant suite of ten stubs
- the director: a repair that spreads past the files a concern names is scope creep
- the preflight's behavior is clamped real: three integration suites, and [case18] (with the call
  removed and rebuilt, 6 of 8 went red)

## .rework — dirty

a migration of the whole suite off `jest.mock` touches every collaborator `execUpgrade` calls; one
stub alone cannot leave, since its siblings hold the same shape.

## .confidence — 70%, and why it is low

the unit rule names no exception, and the reviewer held the blocker through two rounds. a commander
may rule that a new stub owes the migration now.

## .where

- `src/domain.operations/upgrade/execUpgrade.test.ts:48`
- dream: `.dream/v2026_10_26.fix.execupgrade-unit-suite-off-jest-mock.md`

## .verdict

open — the commander's to rule.
