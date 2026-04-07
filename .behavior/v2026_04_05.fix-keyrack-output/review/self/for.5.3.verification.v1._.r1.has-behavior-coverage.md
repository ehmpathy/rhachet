# self-review: has-behavior-coverage

## the question

double-check: does the verification checklist show every behavior from wish/vision has a test?

## the review

### behaviors from 0.wish.md

```
keyrack should support rhx keyrack get --value;
it should also support rhx keyrack source --key xyz, with --strict mode, in a way that matches the sdk
```

| wish behavior | test coverage |
|---------------|---------------|
| `keyrack get --value` | keyrack.get.output.acceptance.test.ts case1 |
| `keyrack source --key xyz` | keyrack.source.cli.acceptance.test.ts case1 t1 |
| `--strict mode` | keyrack.source.cli.acceptance.test.ts case2 |
| `matches the sdk` | strict default, lenient opt-in, silent skip in lenient |

**why it holds:** all four behaviors from the wish are covered in acceptance tests.

### behaviors from 1.vision.md

**day-in-the-life: after** scenarios:

| scenario | test coverage |
|----------|---------------|
| `rhx keyrack get --key API_KEY --env test --value` | keyrack.get.output.acceptance.test.ts case1 t0 |
| `eval "$(rhx keyrack source --env test --owner ehmpath)"` | keyrack.source.cli.acceptance.test.ts case1 t2 |
| `rhx keyrack source --key API_KEY --env test --owner ehmpath` | keyrack.source.cli.acceptance.test.ts case1 t1 |
| `rhx keyrack source --env test --owner ehmpath --strict` | keyrack.source.cli.acceptance.test.ts case2 |
| `rhx keyrack source --env test --owner ehmpath --lenient` | keyrack.source.cli.acceptance.test.ts case3 |

**why it holds:** every command example from the vision has a matched test.

**usecases table from vision:**

| usecase | contract | covered |
|---------|----------|---------|
| pipe secret to command | `keyrack get --key X --value` | case1 t0, t5 |
| set env var in shell | `eval "$(keyrack source --key X)"` | case1 t2 |
| source all repo keys | `eval "$(keyrack source --env test)"` | case1 t0 |
| ci/cd setup | `keyrack source --env test --strict` | case2 |
| local dev (optional keys) | `keyrack source --env test --lenient` | case3, case4 |

**why it holds:** all 5 usecases from the vision table are covered.

### edge cases from vision (pit of success table)

| edge case | expected behavior | test coverage |
|-----------|-------------------|---------------|
| `--value` without `--key` | error: --value requires --key | case4 t0 |
| `--value` with `--for repo` | error: --value requires --key | case4 t1 |
| secret contains single quote | shell-escaped: `'sec'\''ret'` | source case6 t0 |
| secret contains newlines | preserved in output | get case5, source case6 t1 |
| key not granted + strict | exit 2, stderr shows status | source case2 |
| key not granted + lenient | skip, no export for that key | source case3 |

**why it holds:** all 6 edge cases from the vision's pit of success table are covered.

### assumptions from vision

| assumption | verified? | evidence |
|------------|-----------|----------|
| `--value` no final newline | yes | get case1 t2 "has no trailing newline" |
| `source` uses single quotes | yes | source case6 snapshots |
| `--strict` is default | yes | source case2 (no flag = strict behavior) |
| `source` without `--key` = all repo keys | yes | source case1 t0 |

**why it holds:** all 4 assumptions are verified in tests.

## found concerns

none. every behavior from wish and vision is covered:
- 4/4 wish behaviors
- 5/5 day-in-the-life scenarios
- 5/5 usecases from table
- 6/6 edge cases from pit of success
- 4/4 assumptions verified

## conclusion

**behavior coverage check: PASS**

- can point to test file for each behavior in checklist
- 24 behaviors enumerated and mapped to tests (21 + 3 additional from edge cases/assumptions)
- no untested behaviors found
