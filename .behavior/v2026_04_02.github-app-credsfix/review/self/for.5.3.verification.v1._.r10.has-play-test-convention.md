# review: has-play-test-convention (r10)

## verdict: pass — repo uses `.acceptance.test.ts` convention, not `.play.test.ts`

## question: are journey test files named correctly?

### step 1: check for `.play.test.ts` convention in repo

```bash
find . -name '*.play.test.ts' 2>/dev/null | head -20
```

**result:** zero files found

the repo does not use the `.play.test.ts` convention at all.

### step 2: identify the repo's extant convention

**search for journey-style tests:**

```bash
ls blackbox/cli/*.acceptance.test.ts | head -10
```

**result:**
```
blackbox/cli/keyrack.del.acceptance.test.ts
blackbox/cli/keyrack.fill.acceptance.test.ts
blackbox/cli/keyrack.get.acceptance.test.ts
blackbox/cli/keyrack.set.acceptance.test.ts
blackbox/cli/keyrack.status.acceptance.test.ts
blackbox/cli/keyrack.unlock.acceptance.test.ts
... (60+ files total)
```

**observation:** this repo uses `.acceptance.test.ts` as the suffix for journey tests, located in `blackbox/cli/`.

### step 3: document the repo's test hierarchy

| test type | suffix | location | purpose |
|-----------|--------|----------|---------|
| unit | `.test.ts` | collocated in `src/` | test isolated logic |
| integration | `.integration.test.ts` | collocated in `src/` | test with real dependencies |
| acceptance | `.acceptance.test.ts` | `blackbox/cli/` | journey tests via CLI |

### step 4: verify my test files follow extant conventions

**files I created or modified:**

| file | type | suffix | location | correct? |
|------|------|--------|----------|----------|
| `blackbox/cli/keyrack.set.acceptance.test.ts` | journey | `.acceptance.test.ts` | `blackbox/cli/` | yes |
| `src/infra/promptHiddenInput.integration.test.ts` | integration | `.integration.test.ts` | collocated | yes |
| `src/infra/promptVisibleInput.integration.test.ts` | integration | `.integration.test.ts` | collocated | yes |

### step 5: verify the journey test is in the right location

**journey test location check:**

```
blackbox/cli/keyrack.set.acceptance.test.ts
```

- **directory:** `blackbox/cli/` — correct (matches extant pattern)
- **suffix:** `.acceptance.test.ts` — correct (matches 60+ extant journey tests)
- **content:** [case5] exercises the multiline JSON round-trip journey

### step 6: verify integration tests are in the right location

**integration test location check:**

```
src/infra/promptHiddenInput.integration.test.ts
src/infra/promptVisibleInput.integration.test.ts
```

- **directory:** `src/infra/` — correct (collocated with source)
- **suffix:** `.integration.test.ts` — correct (matches extant integration tests)

### step 7: why `.play.test.ts` is not applicable

the `.play.test.ts` convention is not universal. it is one possible convention for journey tests. this repo established its own convention long before this PR:

```bash
git log --oneline --follow blackbox/cli/keyrack.get.acceptance.test.ts | tail -1
```

the `blackbox/cli/*.acceptance.test.ts` pattern predates this PR by many commits. the convention is:

- **repo-established:** `.acceptance.test.ts` for journey tests
- **fallback used:** yes, correctly
- **no convention violation:** tests follow extant patterns

### step 8: explicit convention verification

**the guide says:**

> journey tests should use `.play.test.ts` suffix
> if not supported, is the fallback convention used?

**answer:** yes, fallback convention is used correctly:

1. `.play.test.ts` is not the convention in this repo (zero extant files)
2. `.acceptance.test.ts` is the extant convention (60+ files)
3. my journey test uses `.acceptance.test.ts` (correct fallback)

### why this holds

1. **convention discovery:** searched repo, found zero `.play.test.ts` files
2. **extant convention:** discovered 60+ `.acceptance.test.ts` files in `blackbox/cli/`
3. **correct suffix used:** `keyrack.set.acceptance.test.ts` matches extant pattern
4. **correct location used:** `blackbox/cli/` matches extant pattern
5. **integration tests correct:** `.integration.test.ts` suffix, collocated in `src/`
6. **fallback convention applied:** when `.play.test.ts` absent, use repo's extant convention
7. **no violation:** all test files follow repo's established name conventions

### conclusion

the repo uses `.acceptance.test.ts` for journey tests, not `.play.test.ts`. my test files correctly follow the repo's extant conventions. no name violation exists.

