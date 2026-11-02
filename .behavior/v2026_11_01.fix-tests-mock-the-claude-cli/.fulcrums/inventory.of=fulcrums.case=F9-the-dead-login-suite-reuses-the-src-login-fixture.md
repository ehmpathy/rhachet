# F9 — the dead-login suite reuses the src login fixture

## .the fork

the new `enroll.shared-brain-auth.dead-login` suite plants a claude login file. a fixture for that
shape already exists for unit tests: `src/.test/assets/genSampleBrainAuth.ts`.

| option | what it does | the cost |
|---|---|---|
| A. a second fixture in `blackbox/.test/assets/` | one generator per tier | one shape in two files, which drift apart |
| B. import `@src/.test/assets/genSampleBrainAuth` from blackbox | one generator | the blackbox suite reads a src test asset |

## .taken

B. the measurement: `rhx grepsafe --pattern "from '@src/" --path blackbox --output pipeable | wc -l`
reads 53 lines (control: the same pattern over `src/contract` reads 508, so the query can find).
of those, `clone.prune.acceptance.test.ts:19` and `clone.get-advisory.acceptance.test.ts:13` import
`@src/.test/assets/genSampleCloneOndisk` — the exact form B needs. `rule.require.shared-test-fixtures`
sanctions it for a fixture unit tests also read. so A would duplicate a shape for no rule.

the real [t0] keeps its own inline shapes (`enroll.shared-brain-auth.acceptance.test.ts:40-59`):
real claude reads them, so they carry real-form token prefixes, `refreshTokenExpiresAt`, and
`subscriptionType`, which the mock cli does not need and `genSampleBrainAuth` does not render.

an earlier pass took A on a search for `from '@/src`, an alias this repo does not use; its zero
proved naught. the corrected search above replaces it.

## .rework

clean — A is one new file and an import swap in one suite.

## .confidence

85%. the residual risk: the adopt path ([t4]) may read a field `genSampleBrainAuth` lacks; if so the
fixture gains it as an additive input, which keeps B.

## .where

`3.3.1.blueprint.product.yield.md` — `.the mechanism cases that move to the mock cli`, the fixture note.

## .verdict

best-guessed.
