# review: has-play-test-convention (r9)

## verdict: pass — repo uses `.acceptance.test.ts` convention

## question: are journey test files named correctly?

### step 1: check for `.play.test.ts` convention in repo

```bash
find . -name '*.play.test.ts'
```

**result:** no files found

this repo does not use the `.play.test.ts` convention.

### step 2: identify repo's test conventions

**extant conventions:**

```
blackbox/cli/*.acceptance.test.ts  — 60+ files
src/**/*.integration.test.ts       — collocated integration tests
src/**/*.test.ts                   — unit tests
```

**repo uses:**
- `.acceptance.test.ts` for blackbox journey tests
- `.integration.test.ts` for collocated integration tests
- `.test.ts` for unit tests

### step 3: verify my test files follow conventions

**test files in this PR:**

| file | type | convention | correct? |
|------|------|------------|----------|
| `blackbox/cli/keyrack.set.acceptance.test.ts` (modified) | journey test | `.acceptance.test.ts` | yes |
| `src/infra/promptHiddenInput.integration.test.ts` (new) | integration test | `.integration.test.ts` | yes |
| `src/infra/promptVisibleInput.integration.test.ts` (new) | integration test | `.integration.test.ts` | yes |

### step 4: verify tests are in correct locations

**journey test [case5]:**
- file: `blackbox/cli/keyrack.set.acceptance.test.ts`
- location: `blackbox/cli/` ✓
- suffix: `.acceptance.test.ts` ✓

**integration tests:**
- files: `src/infra/promptHiddenInput.integration.test.ts`, `src/infra/promptVisibleInput.integration.test.ts`
- location: collocated with source files ✓
- suffix: `.integration.test.ts` ✓

### why this holds

1. **repo doesn't use `.play.test.ts`** — convention not established
2. **fallback convention is `.acceptance.test.ts`** — this is what the repo uses
3. **my journey test is in correct file** — `keyrack.set.acceptance.test.ts`
4. **my integration tests follow convention** — `.integration.test.ts` suffix
5. **locations are correct** — blackbox for acceptance, collocated for integration

### conclusion

the repo uses `.acceptance.test.ts` for journey tests, not `.play.test.ts`. my test files follow the repo's extant conventions. no convention violation.

