# self-review: has-play-test-convention (r10)

## question

> are journey test files named correctly?

## analysis

### searched for play test convention

```bash
glob **/*.play.*.test.ts
```

**result**: no files found

### repo test convention

this repo uses acceptance tests for journey coverage:

| convention | pattern | location |
|------------|---------|----------|
| unit | `*.test.ts` | `src/` |
| integration | `*.integration.test.ts` | `src/` |
| acceptance | `*.acceptance.test.ts` | `blackbox/` |

the keyrack firewall journey tests are in:
- `blackbox/cli/keyrack.firewall.acceptance.test.ts`

### why no play tests?

the `.play.test.ts` convention is not used in this repo. acceptance tests serve the same purpose:
- test the CLI as a black-box
- exercise full user journeys
- verify contract outputs via snapshots

### is the fallback convention used?

yes. acceptance tests in `blackbox/cli/` cover:
- credential translation (usecase.1)
- credential filter (usecase.2)
- credential block (usecase.3)
- credential passthrough (usecase.4)
- debug experience (usecase.5, usecase.6)
- error cases (usecase.7, usecase.8, usecase.9)

## why it holds

1. repo does not use `.play.test.ts` convention
2. acceptance tests in `blackbox/` serve as journey tests
3. all usecases from criteria are covered
4. fallback convention is consistent with repo patterns

## verdict

**holds** — repo uses acceptance tests instead of play tests for journey coverage
