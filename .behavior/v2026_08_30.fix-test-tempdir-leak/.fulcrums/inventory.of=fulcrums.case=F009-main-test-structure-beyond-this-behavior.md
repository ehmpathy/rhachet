# F009 — main's test structure, in files touched only for the temp-dir migration, stays as is

## .the fork

5.3 i001: mech-given-when-then blocker.1–9 (an expensive call repeated across adjacent `then`
blocks, not shared via `useThen`) and mech-test-scope-purity blocker.1's five extant files
(`initKeyrack.test.ts`, `getRoleRegistryManifest.test.ts`, `getFile.test.ts`, `config.dao.test.ts`,
`genBrainHooksAdapterForOpencode.test.ts` — unit tests that cross the filesystem). each is real.
each sits in a file this branch touched only to swap a hand-rolled temp dir for `genTempDirPhysical`.

## .taken — keep them out of this behavior's bound

- **none was introduced here.** each pattern is on `origin/main`, line for line; this branch's diff
  in those files is the temp-dir allocation alone
- **the cure is a restructure of nine suites plus five tier moves**, each a change to how a test
  shares state or which tier runs it. that is a refactor of main's tests, which a temp-dir fix must
  not smuggle in (`rule.prefer.scouts-honor`: a large cleanup in an unrelated change is a blocker)
- **the three this branch DID introduce are fixed**: `getTestTempRepoPathPattern.test.ts` →
  `.integration.test.ts`; both `getBrainHooks.test.ts` back to a pure path string, so no dir is made
- the work is caught as a dream, so it is not lost:
  `.dream/v2026_11_23.refactor.main-test-redundant-calls-and-tier-moves.md`

## .rework

clean — each fix is local to its own suite, and none depends on this behavior.

## .confidence

92%. the patterns are verifiable on `origin/main`.

## .verdict

settled by the driver, by reason. disputed, not conceded.
