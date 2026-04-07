# self-review: has-zero-test-skips

## the question

verify: no `.skip()` or `.only()` in new test files that would hide failures.

## the review

### new test files in scope

| file | purpose |
|------|---------|
| `keyrack.get.output.acceptance.test.ts` | --output modes for get command |
| `keyrack.source.cli.acceptance.test.ts` | source subcommand |
| `asShellEscapedSecret.test.ts` | shell escape transformer |

### search results

searched for `.skip` and `.only` patterns:

```
keyrack.get.output.acceptance.test.ts: 0 matches
keyrack.source.cli.acceptance.test.ts: 0 matches
asShellEscapedSecret.test.ts: 0 matches
```

**why it holds:** no test skips found in any new test file.

### silent credential bypasses

checked for patterns that would skip tests when credentials absent:

| pattern | found? |
|---------|--------|
| `if (!cred) return` | no |
| `if (!hasKey) skip` | no |
| `expect.any(Object)` avoidance | no |
| empty test bodies | no |

**why it holds:** all tests execute their intended assertions.

### prior failures carried forward

checked verification checklist against test execution:

- all 65 tests passed
- no prior test failures from other keyrack tests affected these
- deferred gaps in other keyrack tests (vault, sudo, recipient) are out of scope

### deferred gaps (out of scope)

skips found in other keyrack tests are documented in verification checklist:
- `keyrack.vault.awsIamSso.acceptance.test.ts:474` - case7 deferred
- `keyrack.sudo.acceptance.test.ts:1463` - gap.3 deferred
- `keyrack.recipient.acceptance.test.ts:457` - gap.4 deferred

these are prior deferred work, not introduced by this behavior.

## found concerns

none. all new test files have:
- zero `.skip()` calls
- zero `.only()` calls
- zero silent bypasses
- zero empty test bodies

## conclusion

**zero test skips check: PASS**

- 3 new test files verified
- 0 skips or only calls found
- all 65 tests execute their assertions
- deferred gaps in other files are out of scope
