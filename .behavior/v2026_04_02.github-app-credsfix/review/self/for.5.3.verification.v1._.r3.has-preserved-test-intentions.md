# review: has-preserved-test-intentions (r3)

## verdict: pass — no extant tests modified

## question: did you preserve test intentions?

### test files touched

```bash
git diff main --name-only -- '*.test.ts' '*.acceptance.test.ts' '*.integration.test.ts'
```

result: `blackbox/cli/keyrack.set.acceptance.test.ts`

only one test file was changed.

### what changed in that file

```bash
git diff main -- blackbox/cli/keyrack.set.acceptance.test.ts
```

the diff shows:
- all changed lines start with `+` (additions)
- no lines start with `-` (deletions)
- no extant test cases were modified

### the change: purely additive

i added `[case5]` — a new test case for multiline JSON via stdin. this test:
- verifies the fix for the stdin truncation bug
- does not replace or modify any extant test
- does not change any extant assertions

### verification: no weakened assertions

| check | result |
|-------|--------|
| removed test cases | none |
| changed expected values | none |
| weakened assertions | none |
| deleted tests | none |

### why this holds

the PR fixes an internal implementation detail (stdin read pattern). the fix does not change any user-visible contract. therefore:
- extant tests should still pass (they do)
- no test intentions need to change
- a new test covers the new behavior

### the new test intention

`[case5]` tests that:
1. multiline JSON piped to `keyrack set` stores correctly
2. `keyrack get` returns the exact JSON that was piped

this is a new behavior verification, not a modification of extant behavior.

## conclusion

no extant test intentions were modified. the change is purely additive — one new test case to cover the fixed behavior.
