# F8 — two stitch integration tests that skip in ci stay out of this pr

## .the fork
- a: drop `given.runIf(!process.env.CI)` from `invokeImagineStitcher.integration.test.ts:22` and
  `enweaveOneStitcher.integration.test.ts:40` in this pr, so ci runs them on its openai key
- b: leave them; catch the gap with its shape, and flag it to the commander

## .taken = b, why
the two suites test the stitch domain, untouched by this wish. to run them in ci spends openai calls on every
push, a cost the commander has not ruled on, and neither can be run here first (the integration keyrack keys
are absent on this box), so the pr would carry a red-or-green unknown on a domain it does not touch. the
verification gate wants zero skips; this pr adds none, and the extant two are caught:
`.dream/v2026_11_27.fix.two-stitch-integration-tests-skip-in-ci.md`.

## .rework = clean, why
two one-line edits in two test files; no prod code.

## .confidence = 80%, why lower
the gate reads "fix it anyway" for prior failures; a skip is a near kin. a commander who wants them run
here gets a two-line follow-up commit.

## .where
`src/domain.operations/stitch/invokeImagineStitcher.integration.test.ts`,
`src/domain.operations/weave/enweaveOneStitcher.integration.test.ts`

## .verdict
settled: holds (driver, 2026-11-27). the two skips predate this pr, in a domain the `*` wire never
touches. the pr leaves them as they were, so they wait for their dream.
