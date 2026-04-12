# self-review: has-play-test-convention (r9)

## approach

step 1: identify if any journey tests were created for this behavior
step 2: verify name convention if journey tests exist
step 3: assess whether journey tests are appropriate for this behavior

## step 1: search for play tests

searched for play test patterns:
- `**/*.play.test.ts` — no matches
- `**/*.play.*.test.ts` — no matches

## step 2: assess test types created

this behavior created one test file:
- `src/contract/cli/invokeRepoCompile.integration.test.ts` — integration tests

this is an integration test, not a journey test. integration tests verify:
- CLI command options work correctly
- artifacts are copied to destination
- error cases fail fast

## step 3: are journey tests appropriate?

journey tests (`.play.test.ts`) are for user journeys — multi-step flows that simulate real usage across commands.

this behavior is a single command (`repo compile`) with straightforward inputs and outputs:
1. user runs `npx rhachet repo compile --from src --into dist`
2. rhachet copies artifacts
3. done

no multi-step journey required. integration tests verify the command works. no journey test needed.

## why it holds

1. **no play tests exist** — verified via glob search
2. **no play tests needed** — single command behavior, not a multi-step journey
3. **integration tests cover the contract** — 16 test cases verify CLI behavior
4. **name convention not applicable** — no journey tests to name

the behavior is simple enough that integration tests are sufficient. journey tests would add no additional value.

