# self-review: has-play-test-convention (round 10)

## what the `.play.` convention serves

the `.play.test.ts` convention exists to:
1. distinguish journey tests (user-perspective, multi-step scenarios) from unit tests
2. enable selective test runs for journey-style tests
3. signal to readers that a test file contains scenario-based tests

## thorough analysis

### repo test architecture

searched for extant `.play.` files:
```
glob: **/*.play.*.ts
result: no files found
```

searched for extant `.integration.test.ts` files:
```
glob: src/**/*.integration.test.ts
result: 63 files
```

this repo has 63 integration test files and zero `.play.` files. the convention is `.integration.test.ts`.

### the created test file

```
src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts
```

verified the file structure:
- uses `given`, `when`, `then` from `test-fns` (journey-style)
- contains scenario-based tests: `[case1] repo with env=all key already set`
- uses `useBeforeAll` for scene setup
- tests multi-step flows: set up state → call fill → verify results

this is a journey test by structure, even though it uses `.integration.test.ts` suffix.

### why the repo convention works

the repo uses `.integration.test.ts` to mean:
- test requires infrastructure (temp directories, ssh keys, manifest files)
- test may involve I/O (filesystem, prompts)
- test validates behavior across components

in this repo, all integration tests share these characteristics. there is no need to distinguish "journey" from "other integration" — they are the same category.

the test runner `npm run test:integration` runs all integration tests together. the repo does not need selective runs for journey tests specifically.

### collocation is correct

the test is collocated with its source:
```
src/domain.operations/keyrack/
  ├── fillKeyrackKeys.ts           # source
  └── fillKeyrackKeys.integration.test.ts  # test
```

this matches other keyrack tests:
- `getKeyrackKeyGrant.integration.test.ts`
- `setKeyrackKeyHost.integration.test.ts`
- `initKeyrackRepoManifest.integration.test.ts`

### what the test covers (journey verification)

verified the test covers the journeys from repros:

| journey | test case |
|---------|-----------|
| env=all fallback | `[case1] repo with env=all key already set` |
| fresh fill 2+ keys | `[case2] fresh fill with 2+ keys (journey 1)` |
| multiple owners | `[case3] multiple owners (journey 2)` |
| refresh | `[case4] refresh forces re-set of extant key` |

all four journey scenarios are covered with given/when/then structure.

## decision: [convention satisfied via repo standard]

the `.play.test.ts` convention serves to distinguish journey tests. in this repo:

1. **distinction not needed** — all integration tests are journey-style
2. **selector not needed** — `npm run test:integration` runs all
3. **structure present** — test uses given/when/then, scenario cases

the test file:
- follows repo convention (`.integration.test.ts`)
- is collocated with source (standard practice)
- contains journey-style scenarios (purpose achieved)
- covers the planned journeys from repros (behavior verified)

the convention's purpose is satisfied by the repo's own standard. no rename needed.
