# review: has-preserved-test-intentions (r4)

## verdict: pass — all test changes are additive

## question: did you preserve test intentions?

### test file inventory

**new files (untracked):**
- `src/infra/__test_promptHiddenInput.ts` — test runner
- `src/infra/__test_promptVisibleInput.ts` — test runner
- `src/infra/promptHiddenInput.integration.test.ts` — new tests
- `src/infra/promptVisibleInput.integration.test.ts` — new tests

**modified files (not staged):**
- `blackbox/cli/keyrack.set.acceptance.test.ts` — added `[case5]`
- `src/infra/promptHiddenInput.ts` — the fix
- `src/infra/promptVisibleInput.ts` — the fix

### for every test touched: what did it verify before?

#### integration tests: entirely new

the integration test files did not exist before. these are new tests to cover the fixed behavior.

| file | before | after |
|------|--------|-------|
| promptHiddenInput.integration.test.ts | did not exist | tests stdin via spawn |
| promptVisibleInput.integration.test.ts | did not exist | tests stdin via spawn |

**no prior intention to preserve** — these are new tests.

#### acceptance test: one addition

the acceptance test file had [case1] through [case4]. i added [case5].

```bash
git diff HEAD -- blackbox/cli/keyrack.set.acceptance.test.ts
```

the diff shows:
- lines 282-391 added (all `+` lines)
- zero deletions
- zero modifications to extant cases

| case | before | after |
|------|--------|-------|
| [case1] | tests basic set | unchanged |
| [case2] | tests vault types | unchanged |
| [case3] | tests env variants | unchanged |
| [case4] | tests mech types | unchanged |
| [case5] | did not exist | tests multiline stdin |

**extant intentions preserved** — [case1-4] unchanged, [case5] is new.

### forbidden checks

| check | result | evidence |
|-------|--------|----------|
| weakened assertions | no | no deletions in diff |
| removed test cases | no | all extant cases remain |
| changed expected values | no | no `-` lines in diff |
| deleted tests | no | no file deletions |

### why this holds

1. **integration tests are new** — they test behavior that was not tested before
2. **acceptance test change is additive** — only added [case5], no modifications
3. **extant cases still pass** — 20/20 acceptance tests pass

### the new test intentions

**integration tests:**
- verify stdin read via spawn (isolates process.stdin)
- cover single-line, multi-line, empty, and newline-terminated input

**acceptance test [case5]:**
- verify multiline JSON roundtrips through keyrack set/get
- this is the exact bug scenario from the wish

## conclusion

no test intentions were modified. all changes are additive:
- 4 new test files
- 1 new test case in extant file

extant test intentions remain intact.
