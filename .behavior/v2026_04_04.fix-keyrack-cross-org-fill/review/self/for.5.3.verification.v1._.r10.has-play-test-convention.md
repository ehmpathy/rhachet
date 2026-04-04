# self-review: has-play-test-convention (r10)

## the core question

> are journey test files named correctly with `.play.test.ts` suffix?

## step 1: understand the repo's test conventions

**search for play tests**:

```bash
glob **/*.play.test.ts
glob **/*.play.*.test.ts
```

**result**: no matches. this repo does not use the `.play.test.ts` convention.

**search for integration tests**:

```bash
glob src/**/*.integration.test.ts
```

**result**: 66 files found. this repo uses `.integration.test.ts` for domain-level journey tests.

**search for acceptance tests**:

```bash
glob **/*.acceptance.test.ts
```

**result**: 72 files found. this repo uses `.acceptance.test.ts` for blackbox CLI/SDK tests.

## step 2: document the repo's test convention

| suffix | purpose | location | count |
|--------|---------|----------|-------|
| `.test.ts` | unit tests | collocated | many |
| `.integration.test.ts` | journey tests (domain operations) | collocated | 66 |
| `.acceptance.test.ts` | blackbox tests (CLI, SDK) | `blackbox/` | 72 |

**convention**: this repo uses `.integration.test.ts` as the fallback for journey tests, not `.play.test.ts`.

## step 3: verify PR follows repo convention

**tests in this PR**:

| file | type | convention followed? |
|------|------|---------------------|
| `asKeyrackKeyOrg.test.ts` | unit test | yes (`.test.ts`) |
| `fillKeyrackKeys.integration.test.ts` | integration test (case8 inserted) | yes (`.integration.test.ts`) |

**journey test for cross-org extends**:

the guide asks: "are journey tests in the right location?"

**location check**:
- `fillKeyrackKeys.integration.test.ts` is in `src/domain.operations/keyrack/`
- this is the correct location — collocated with the code it tests
- the integration test case8 tests the full journey for cross-org extends

## step 4: verify case8 is a journey test

**journey test characteristics**:
1. tests a complete user scenario
2. exercises multiple layers
3. validates end-to-end behavior

**case8 analysis** (`fillKeyrackKeys.integration.test.ts` lines 659-744):

| characteristic | case8 evidence |
|----------------|----------------|
| complete scenario | creates repos, manifests, calls fill, verifies results |
| multiple layers | manifest hydration → fill → set → roundtrip verify |
| end-to-end | input: repo setup → output: keys stored under correct orgs |

case8 is a journey test.

## step 5: why no `.play.test.ts`?

the guide asks: "if not supported, is the fallback convention used?"

**analysis**:

1. this repo has no `.play.test.ts` files (verified via glob)
2. this repo uses `.integration.test.ts` for journey tests
3. the PR follows the repo's convention — case8 inserted into `fillKeyrackKeys.integration.test.ts`

**fallback convention**: `.integration.test.ts` — used correctly.

## step 6: verify no convention violation

**convention requirements**:

| requirement | status |
|-------------|--------|
| journey test exists | yes (case8) |
| journey test in right location | yes (collocated) |
| journey test follows repo convention | yes (`.integration.test.ts`) |
| play test convention applicable | no (repo uses fallback) |

no convention violation.

## conclusion

| check | result | evidence |
|-------|--------|----------|
| play test convention used? | no | repo has zero `.play.test.ts` files |
| fallback convention used? | yes | repo uses `.integration.test.ts` |
| PR follows convention? | yes | case8 inserted into `.integration.test.ts` |
| journey test in right location? | yes | collocated in `domain.operations/keyrack/` |
| convention violation? | no | all tests follow repo conventions |

this repo does not use the `.play.test.ts` convention. it uses `.integration.test.ts` as the fallback for journey tests. the PR follows this convention with case8 in `fillKeyrackKeys.integration.test.ts`. no convention violation.
