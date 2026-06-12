# rule.require.separate-cli-sdk-acceptance-tests

## .what

acceptance tests for CLI and SDK must be in separate files with parity in test coverage.

## .why

- CLI and SDK are distinct contract boundaries
- CLI tests verify subprocess invocation, exit codes, stdout/stderr
- SDK tests verify function calls, return values, process.env injection
- separate files make the test suite easier to navigate
- enables run of one contract type without the other
- parity ensures both paths have equivalent coverage

## .where

| contract | directory | file pattern |
|----------|-----------|--------------|
| CLI | `blackbox/cli/` | `*.acceptance.test.ts` |
| SDK | `blackbox/sdk/` | `*.acceptance.test.ts` |

## .pattern

```
blackbox/
  cli/
    keyrack.source.acceptance.test.ts        # CLI tests only
    keyrack.source.is-optional-if-has.acceptance.test.ts  # CLI tests only
  sdk/
    keyrack.source.acceptance.test.ts        # SDK tests only
    keyrack.source.is-optional-if-has.acceptance.test.ts  # SDK tests only
```

## .parity requirement

every scenario tested via CLI must also be tested via SDK, and vice versa:

| scenario | CLI test | SDK test |
|----------|----------|----------|
| happy path: key supplied | required | required |
| happy path: alternative satisfied | required | required |
| error path: keys absent | required | required |
| edge case: empty alternative | required | required |

## .enforcement

- SDK test in `blackbox/cli/` = blocker
- CLI test in `blackbox/sdk/` = blocker
- mixed CLI+SDK in same file = blocker
- parity gap (scenario in one but not other) = blocker
