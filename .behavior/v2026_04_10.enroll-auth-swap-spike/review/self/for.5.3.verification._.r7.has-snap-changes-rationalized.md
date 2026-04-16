# self-review: has-snap-changes-rationalized (r7)

review for snapshot file change justification.

---

## the question

is every `.snap` file change intentional and justified?

---

## snapshot file audit

### searched for snapshot changes

```
$ git diff main...HEAD --name-only -- '*.snap'
> (no results)
```

**result: zero snapshot files were changed in this spike.**

### why no snapshot changes?

the spike adds internal behaviors that are tested via:

| test type | snapshot usage | why |
|-----------|----------------|-----|
| unit tests | caselist assertions | transformers verify specific input/output pairs |
| integration tests | direct assertions | orchestrator verifies keyrack interactions |
| acceptance tests | deferred | CLI snapshots require credentials (phase 8) |

none of the spike tests use `toMatchSnapshot()` or `toMatchInlineSnapshot()`.

### is this intentional?

**yes.** the spike tests internal behaviors that are better suited to direct assertions:

1. **transformers** — `asBrainAuthSpecShape`, `asBrainAuthTokenSlugs`, `genApiKeyHelperCommand` are pure functions. caselist tests verify each input/output pair explicitly. snapshots would add noise without benefit.

2. **orchestrator** — `getOneBrainAuthCredentialBySpec` integrates with keyrack. integration tests verify behavior against real keyrack state. snapshots would contain sensitive credential data.

3. **CLI** — `invokeBrainsAuth` is deferred to phase 8 for full acceptance tests. when implemented, those tests WILL use snapshots for output variants.

---

## verification: no prior snapshot regression

### searched for modified snapshots

```
$ git diff main...HEAD --stat -- '*.snap'
> (no changes)
```

**result: no prior snapshot files were modified.**

the spike is additive — it adds new tests without changes to prior test files. since no prior tests were touched, no prior snapshots could have regressed.

### checked common regression patterns

the guide mentions common regressions:

| regression type | checked? | result |
|-----------------|----------|--------|
| output format degraded | YES | n/a — no .snap changes |
| error messages became less helpful | YES | n/a — no .snap changes |
| timestamps or ids leaked into snapshots | YES | n/a — no .snap changes |
| extra output added unintentionally | YES | n/a — no .snap changes |

since zero .snap files changed, these regression patterns cannot have occurred.

### verified spike test files do not produce snapshots

i examined each spike test file:

```
$ grep -l 'toMatchSnapshot\|toMatchInlineSnapshot' src/domain.operations/brainAuth/*.test.ts
> (no results)
```

**none of the spike test files call snapshot methods.** this is intentional — transformers use caselist assertions which are more explicit.

### verified prior tests still pass

```
$ rhx git.repo.test --what unit
> 95 tests passed, 0 failed, 0 skipped

$ rhx git.repo.test --what integration
> 16 tests passed, 0 failed, 0 skipped

$ rhx git.repo.test --what acceptance
> 1498 tests passed, 0 failed, 26 skipped
```

**all tests pass.** if any prior snapshots had been corrupted, the tests would fail. the fact that all tests pass confirms:
1. no prior snapshot regressions
2. no snapshot drift introduced by spike changes
3. spike is truly additive

---

## checklist

| checklist item | status |
|----------------|--------|
| snapshot files changed? | **NONE** — zero .snap changes |
| snapshot changes intentional? | **N/A** — no changes to review |
| prior snapshots regressed? | **NO** — no modifications |
| new snapshots needed? | **DEFERRED** — CLI snapshots in phase 8 |

---

## verdict: PASS

the spike introduces zero snapshot file changes. this is intentional because:

1. unit tests use caselist assertions (more explicit than snapshots)
2. integration tests verify live keyrack behavior (sensitive data)
3. CLI acceptance tests are deferred (phase 8)

no prior snapshots were modified, so no regressions to review. the absence of new snapshots for CLI is addressed in r6 (has-contract-output-variants-snapped).
