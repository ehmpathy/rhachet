# self-review: has-play-test-convention

## the question

double-check: are journey test files named correctly?

## the review

### repo test convention check

checked for `.play.test.ts` files in repo:

```
$ find . -name '*.play.test.ts'
(no results)

$ find . -name '*.play.*.test.ts'
(no results)
```

**result:** this repo does not use the `.play.` test convention.

### actual convention used

from `git diff main --name-only -- '*.test.ts'`:

| pattern | location | purpose |
|---------|----------|---------|
| `.test.ts` | `src/` | unit tests |
| `.integration.test.ts` | `src/` | integration tests |
| `.acceptance.test.ts` | `blackbox/cli/` | acceptance/journey tests |

### behavior's test files

this behavior added:

| file | convention |
|------|------------|
| `keyrack.get.output.acceptance.test.ts` | acceptance |
| `keyrack.source.cli.acceptance.test.ts` | acceptance |
| `asShellEscapedSecret.test.ts` | unit |

### why this holds

the guide states:
> "if not supported, is the fallback convention used?"

**yes.** this repo's fallback convention is `.acceptance.test.ts` for journey-style tests. the behavior's acceptance tests follow this convention.

the acceptance tests in `blackbox/cli/` are journey tests:
- they test from the CLI contract layer
- they invoke the real binary via subprocess
- they verify user-visible input/output
- they are black-box (no internal imports)

### convention consistency check

verified via glob:

```bash
$ ls blackbox/cli/*.test.ts
keyrack.fill.acceptance.test.ts
keyrack.get.acceptance.test.ts
keyrack.get.output.acceptance.test.ts  ← this behavior
keyrack.init.acceptance.test.ts
keyrack.set.acceptance.test.ts
keyrack.source.cli.acceptance.test.ts  ← this behavior
keyrack.status.acceptance.test.ts
```

all CLI journey tests use `.acceptance.test.ts`. the behavior's tests are consistent.

## found concerns

none. the behavior follows the repo's established convention:
- journey tests use `.acceptance.test.ts` suffix
- files located in `blackbox/cli/`
- no `.play.` convention in this repo

## conclusion

**has-play-test-convention check: PASS**

- repo uses `.acceptance.test.ts` as fallback for journey tests
- behavior's tests follow this convention
- no convention drift

