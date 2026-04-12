# self-review: has-play-test-convention (r10)

## approach

the guide asks: are journey test files named correctly with `.play.test.ts` suffix?

step 1: search for play tests in the behavior
step 2: analyze what tests were created
step 3: determine if play tests are needed
step 4: verify no convention violation

## step 1: search for play tests

searched patterns:
- `**/*.play.test.ts` — 0 matches
- `**/*.play.*.test.ts` — 0 matches

no play tests exist in this behavior.

## step 2: analyze tests created

this behavior created one test file:
```
src/contract/cli/invokeRepoCompile.integration.test.ts
```

examined test structure:
- uses `test-fns` (given/when/then pattern)
- creates temp test packages via `createTestPackage()`
- invokes CLI via `invokeRepoCompile()` helper
- verifies file artifacts and stdout/stderr

test cases:
- [case1] rhachet-roles-* package with briefs
- [case2] role with keyrack.yml
- [case3] role with boot.yml
- [case4] briefs with .test dir
- [case5-7] various exclusion patterns
- [case8] --from dir not found
- [case9] not a rhachet-roles-* package

these are **integration tests** — each case invokes the CLI command once and verifies output. this matches the `.integration.test.ts` suffix.

## step 3: are play tests needed?

play tests (`.play.test.ts`) are for **multi-step user journeys** that span multiple commands or actions:

| test type | scope | example |
|-----------|-------|---------|
| integration | single command | `repo compile` copies files correctly |
| journey/play | multi-step flow | init project → add roles → compile → publish |

this behavior implements a single command (`repo compile`). the user journey is:
1. run `npx rhachet repo compile --from src --into dist`
2. done

no multi-step orchestration. no cross-command state. no journey to test.

## step 4: verify no convention violation

| check | status |
|-------|--------|
| play tests exist | no |
| play tests needed | no |
| integration tests use `.integration.test.ts` | yes |
| test file location correct | yes (`src/contract/cli/`) |

no convention violation.

## why it holds

1. **no play tests exist** — verified via glob search across the entire repo

2. **no play tests needed** — the command is atomic:
   - single invocation
   - immediate result
   - no state carried between invocations
   - no multi-command orchestration

3. **integration tests are appropriate** — they verify:
   - CLI accepts correct options
   - artifacts are copied correctly
   - error cases fail fast with clear messages
   - snapshots capture output for vibecheck

4. **convention is correct** — integration tests use `.integration.test.ts` suffix as expected

5. **no rename required** — no journey tests exist that would need the `.play.` suffix

the test strategy matches the scope of the behavior: a single command verified by integration tests.

