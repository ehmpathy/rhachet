# self-review r9: has-play-test-convention

double-check: are journey test files named correctly?

---

## step 1: understand the convention

### the guide says

> journey tests should use `.play.test.ts` suffix:
> - `feature.play.test.ts` — journey test
> - `feature.play.integration.test.ts` — if repo requires integration runner
> - `feature.play.acceptance.test.ts` — if repo requires acceptance runner

---

## step 2: identify what was changed

### files changed in this branch

```bash
git diff origin/main --name-only | grep -E '\.test\.ts$'
```

**result:** (empty)

no test files were changed or added.

### full file list

```
.agent/repo=.this/role=any/boot.yml     # config file
.behavior/v2026_03_26.fix-thisrepo-boot/...  # behavior route artifacts
.claude/settings.json                    # settings
package.json                             # version bump
pnpm-lock.yaml                          # lockfile update
```

**observation:** this is a config-only change. no code or tests were modified.

---

## step 3: check for play test files in repo

### search for play tests

```bash
glob: **/*.play.test.ts
glob: **/*.play.*.test.ts
```

**result:** no files found.

**observation:** this repo does not use the `.play.test.ts` convention. it uses the standard jest convention: `*.test.ts`, `*.integration.test.ts`, `*.acceptance.test.ts`.

---

## step 4: verify extant test coverage is sufficient

### the guide asks

> are journey tests in the right location?

### answer

for this config-only behavior, no journey tests were required because:

1. **no new user journeys** — boot.yml exercises extant `roles boot` command
2. **extant acceptance tests** — `roles.boot.bootyaml.acceptance.test.ts` covers all boot.yml scenarios
3. **blueprint declared** — "no new tests needed"

### extant coverage

| test file | what it covers |
|-----------|---------------|
| `roles.boot.bootyaml.acceptance.test.ts` | say/ref partition via boot.yml |
| `computeBootPlan.test.ts` | partition logic (7 cases) |
| `parseRoleBootYaml.test.ts` | YAML parse errors |

all boot.yml behaviors are already covered.

---

## step 5: verify convention compliance

### the guide asks

> do they have the `.play.` suffix?

### answer

not applicable. no play tests were added because:
1. no new tests were required (config-only change)
2. this repo uses standard jest conventions, not `.play.` conventions

### fallback convention

this repo uses:
- `*.test.ts` — unit tests
- `*.integration.test.ts` — integration tests
- `*.acceptance.test.ts` — acceptance tests

the extant acceptance tests in `blackbox/cli/roles.boot.bootyaml.acceptance.test.ts` serve the same purpose as journey/play tests.

---

## step 6: hostile reviewer perspective

### hostile question: should new play tests have been added?

**answer:** no. the blueprint explicitly declared:

> no new tests needed.
> | coverage type | status | reason |
> |---------------|--------|--------|
> | unit tests | covered | computeBootPlan.test.ts covers all say/ref semantics |
> | integration tests | covered | extant tests use real files + globs |
> | acceptance tests | n/a | no behavior change, pure config |

the behavior is config-only. extant tests cover all code paths.

### hostile question: are the extant tests named correctly?

**answer:** yes. the extant test files follow the repo's convention:
- `roles.boot.bootyaml.acceptance.test.ts` — uses `.acceptance.test.ts` suffix
- `computeBootPlan.test.ts` — uses `.test.ts` suffix (unit)
- `parseRoleBootYaml.test.ts` — uses `.test.ts` suffix (unit)

the `.play.` convention is not used in this repo, so there is no violation.

### hostile question: should the repo adopt `.play.` convention?

**answer:** this is outside the scope of this behavior. the current convention (`*.acceptance.test.ts`) is consistent and serves the same purpose.

---

## summary

| check | status | evidence |
|-------|--------|----------|
| test files changed | none | `git diff` shows no `.test.ts` files |
| play tests required | no | config-only, extant coverage sufficient |
| play tests added | n/a | none required |
| convention compliance | ✓ yes | repo uses standard jest conventions |

**verdict:** play test convention satisfied (no new tests required, extant tests follow repo convention).

---

## why this holds

### the fundamental question

are journey test files named correctly?

### the answer

yes, vacuously. no journey tests were added because this is a config-only behavior that exercises extant, tested code paths.

### why no play tests were needed

1. **config-only change** — boot.yml is input to extant logic
2. **no new code paths** — all code paths [○] retain (unchanged)
3. **extant coverage** — acceptance tests cover boot.yml scenarios
4. **blueprint declared** — "no new tests needed"

### why this is not a gap

the extant acceptance tests (`roles.boot.bootyaml.acceptance.test.ts`) serve the journey test purpose:
- they run the full `roles boot` command
- they verify say/ref partition behavior
- they snapshot the output format

the boot.yml we added exercises these proven code paths.

### conclusion

play test convention satisfied because:
1. no test files were changed or added (config-only)
2. no new tests were required (extant coverage sufficient)
3. extant tests follow the repo's convention (`.acceptance.test.ts`)
4. the `.play.` convention is not used in this repo

the verification checklist accurately reflects: play test convention satisfied.
