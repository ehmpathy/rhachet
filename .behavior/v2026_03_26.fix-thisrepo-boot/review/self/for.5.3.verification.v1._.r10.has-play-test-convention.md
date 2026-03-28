# self-review r10: has-play-test-convention

double-check: are journey test files named correctly?

---

## step 1: understand the convention

### the guide says

> journey tests should use `.play.test.ts` suffix:
> - `feature.play.test.ts` — journey test
> - `feature.play.integration.test.ts` — if repo requires integration runner
> - `feature.play.acceptance.test.ts` — if repo requires acceptance runner

### fallback verification

> if not supported, is the fallback convention used?

---

## step 2: identify test files changed

### files changed in this branch

```bash
git diff origin/main --name-only | grep -E '\.test\.ts$'
```

**result:** (empty)

**verdict:** no test files were changed or added in this branch.

---

## step 3: verify play convention in repo

### search for play tests

```bash
glob: **/*.play.test.ts
glob: **/*.play.*.test.ts
```

**result:** no files found.

**verdict:** this repo does not use the `.play.test.ts` convention.

---

## step 4: identify repo's test convention

### extant acceptance tests

```bash
glob: blackbox/cli/*.acceptance.test.ts
```

**result:** 61 files, e.g.:
- `roles.boot.bootyaml.acceptance.test.ts` — covers boot.yml scenarios
- `roles.boot.acceptance.test.ts` — covers basic boot behavior
- `roles.boot.published.acceptance.test.ts` — covers published role boot
- `run.skill.acceptance.test.ts` — covers skill execution
- ... (57 more)

### observed convention

| pattern | count | purpose |
|---------|-------|---------|
| `*.acceptance.test.ts` | 61 | journey tests (blackbox) |
| `*.integration.test.ts` | varies | integration tests |
| `*.test.ts` | varies | unit tests |

**verdict:** this repo uses `.acceptance.test.ts` as the journey test convention.

---

## step 5: verify extant coverage for boot.yml

### key test file

**file:** `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts`

**purpose:** tests all boot.yml scenarios via acceptance tests (blackbox invocation of `roles boot` command).

### scenarios covered

from the snapshot file `roles.boot.bootyaml.acceptance.test.ts.snap`:

| case | scenario | coverage |
|------|----------|----------|
| case1 | boot.yml with say globs | say/ref partition |
| case2 | no boot.yml present | default behavior (all say) |
| case4 | boot.yml subject mode | multi-subject curation |
| case5 | subject without always | subject-only curation |
| case6 | boot.yml with minified briefs | .md.min variant preference |

**verdict:** boot.yml behaviors are covered by extant acceptance tests.

---

## step 6: answer the guide's questions

### are journey tests in the right location?

**answer:** the repo's journey tests are in `blackbox/cli/`. this is correct — blackbox tests live in the `blackbox/` directory.

### do they have the `.play.` suffix?

**answer:** no. this repo uses `.acceptance.test.ts` suffix instead of `.play.test.ts`. this is the repo's established convention.

### if not supported, is the fallback convention used?

**answer:** yes. the fallback convention (`.acceptance.test.ts`) is consistently used across 61 test files.

---

## step 7: verify no new tests were required

### blueprint declaration

from `3.3.1.blueprint.product.v1.i1.md`:

> no new tests needed.
> | coverage type | status | reason |
> |---------------|--------|--------|
> | unit tests | covered | computeBootPlan.test.ts covers all say/ref semantics |
> | integration tests | covered | extant tests use real files + globs |
> | acceptance tests | n/a | no behavior change, pure config |

### why no new acceptance tests

1. **config-only change** — boot.yml exercises extant `roles boot` command
2. **extant coverage** — `roles.boot.bootyaml.acceptance.test.ts` covers all boot.yml variants
3. **no new scenarios** — boot.yml we added exercises case1 (say globs → partition)
4. **tests pass** — all acceptance tests pass without modification

---

## step 8: hostile reviewer perspective

### hostile question: should the boot.yml scenario have a new acceptance test?

**answer:** no. the boot.yml we added exercises case1 from the extant acceptance test:
- case1 tests: `briefs.say` has globs → matched say, unmatched ref
- boot.yml has: `briefs.say` has 7 globs → 7 say, 12 ref

the behavior is identical. the test coverage is sufficient.

### hostile question: why not add a specific test for repo=.this/role=any?

**answer:** acceptance tests use isolated test fixtures (temp repos) by design. this prevents:
1. tests coupled to repo content (brittle)
2. updates when briefs change (maintenance burden)
3. duplicate case1 coverage

the mechanism is proven correct by tests. the boot.yml we added exercises the proven mechanism.

### hostile question: should this repo adopt `.play.` convention?

**answer:** this is outside the scope of this behavior. the current convention (`.acceptance.test.ts`) is:
- consistent across 61 files
- semantically equivalent to `.play.acceptance.test.ts`
- well-established in the codebase

---

## summary

| check | status | evidence |
|-------|--------|----------|
| test files changed | none | `git diff` shows no `.test.ts` files |
| play convention used | no | repo uses `.acceptance.test.ts` instead |
| fallback convention used | ✓ yes | 61 files follow `.acceptance.test.ts` |
| extant coverage sufficient | ✓ yes | `roles.boot.bootyaml.acceptance.test.ts` covers all variants |
| new tests required | no | config-only, blueprint declared none needed |

**verdict:** play test convention satisfied (repo uses `.acceptance.test.ts` fallback, extant coverage sufficient).

---

## why this holds

### the fundamental question

are journey test files named correctly?

### the answer

yes. this repo uses `.acceptance.test.ts` as its journey test convention, not `.play.test.ts`. this is a valid fallback convention per the guide:

> if not supported, is the fallback convention used?

### evidence chain

| claim | verification | result |
|-------|--------------|--------|
| no `.play.test.ts` files | glob search | 0 files |
| `.acceptance.test.ts` used | glob search | 61 files |
| boot.yml covered | read snapshot | case1 covers say globs |
| no tests changed | `git diff` | empty result |

### why no new journey tests were needed

1. **config-only change** — boot.yml is input to extant logic
2. **extant acceptance test** — `roles.boot.bootyaml.acceptance.test.ts` exists
3. **case1 coverage** — boot.yml exercises case1 (say globs → partition)
4. **blueprint declaration** — "no new tests needed"

### conclusion

play test convention satisfied because:
1. this repo uses `.acceptance.test.ts` (valid fallback convention)
2. 61 extant acceptance tests follow this convention consistently
3. `roles.boot.bootyaml.acceptance.test.ts` covers all boot.yml variants
4. no new tests were required (config-only change)
5. extant tests pass without modification

the verification checklist accurately reflects: play test convention satisfied.
