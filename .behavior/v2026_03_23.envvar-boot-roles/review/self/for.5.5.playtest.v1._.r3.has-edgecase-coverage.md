# review: has-edgecase-coverage

> **reviewed 2026-03-25** — fresh articulation of edgecase coverage

---

## issue found and fixed

**bug detected:** row 6 in syntax variations table incorrectly stated "no roles flag" uses "default behavior".

**reality:** step 6 is an error case. `--roles` is required per the hard requirement in wish and vision. absent flag means error, not defaults.

**fix applied:** changed "default behavior" to "error: --roles required" in the syntax variations table (line 55).

**why this matters:** the playtest document (`5.5.playtest.v1.i1.md`) was corrected to reflect that `--roles` is mandatory. this review file must match that correction to maintain consistency across artifacts.

---

## the question

are edge cases covered? what could go wrong? what inputs are unusual but valid? are boundaries tested?

---

## verification method

1. brainstorm what could go wrong
2. brainstorm unusual but valid inputs
3. identify boundary conditions
4. map each to playtest steps or note gaps

---

## what could go wrong?

### input errors (user mistakes)

| what could go wrong | playtest coverage | why covered |
|---------------------|-------------------|-------------|
| typo in role name | step 7: `--roles mechnic` | exact scenario, tests suggestion |
| empty roles string | step 8: `--roles ""` | exact scenario, tests error |
| conflict in ops | step 9: `+mechanic,-mechanic` | exact scenario, tests error |
| role not in defaults (subtract) | step 10: `--roles -nonexistent` | tests idempotent behavior |
| role already in defaults (append) | step 11: `--roles +mechanic` | tests idempotent behavior |

### system state errors (setup problems)

| what could go wrong | playtest coverage | why not covered |
|---------------------|-------------------|-----------------|
| no `.agent/` directory | not covered | setup error, automated tests handle it |
| no linked roles | not covered | setup error, prerequisites assume roles extant |
| malformed `.agent/` structure | not covered | corruption, out of scope for feature playtest |

**decision:** system state errors are excluded because they are pre-condition failures, not feature behaviors.

---

## unusual but valid inputs

### syntax variations

| unusual input | playtest coverage | why valid |
|---------------|-------------------|-----------|
| single role replace | step 1: `--roles mechanic` | simplest case |
| multi-role replace | step 2: `--roles mechanic,ergonomist` | list syntax |
| single role subtract | step 3: `--roles -driver` | delta with minus prefix |
| single role append | step 4: `--roles +architect` | delta with plus prefix |
| mixed subtract and append | step 5: `--roles -driver,+architect` | compound delta |
| no roles flag at all | step 6: (no --roles) | error: --roles required |

### passthrough variations

| unusual input | playtest coverage | why valid |
|---------------|-------------------|-----------|
| `--resume` flag | step 12 | brain flag, should pass through |

**potential gap: what about multiple passthrough flags?**

example: `--roles mechanic --resume --dangerously-skip-permissions`

this is not in the playtest. however:
- step 12 tests the pattern (one passthrough flag)
- the mechanism is the same for any number of flags
- automated tests verify the passthrough code path

**decision:** acceptable gap. the pattern is tested; multiple flags are a quantity variation, not a behavior variation.

---

## boundary conditions

### cardinality boundaries

| boundary | playtest coverage | why it matters |
|----------|-------------------|----------------|
| 0 roles (empty string) | step 8 | lower bound, should error |
| 1 role (replace) | step 1 | typical case |
| 2 roles (multi-replace) | step 2 | list behavior |
| N roles (many) | not tested | large lists |

**potential gap: many roles (N > 2)**

example: `--roles mechanic,driver,ergonomist,architect,designer`

this is not in the playtest. however:
- step 2 tests the list mechanism (comma-separated)
- the mechanism scales linearly
- automated tests can cover large-N scenarios if needed

**decision:** acceptable gap. the list mechanism is tested at N=2; scale is mechanical.

### state boundaries

| boundary | playtest coverage | why it matters |
|----------|-------------------|----------------|
| subtract absent role | step 10 | idempotent, no-op |
| append present role | step 11 | idempotent, no duplicates |
| subtract all defaults | not tested | would result in empty config |

**potential gap: subtract all defaults**

example: `--roles -mechanic,-driver,-ergonomist`

what happens if you subtract ALL default roles? the config would have no hooks.

this is not in the playtest. however:
- the semantics are clear: empty hooks array
- this is an unusual but valid scenario
- automated tests should cover this edge case

**decision:** acceptable gap for playtest. this is a boundary case that automated tests should verify. the playtest focuses on typical workflows.

---

## summary of gaps

| gap | type | decision | rationale |
|-----|------|----------|-----------|
| no `.agent/` directory | setup error | exclude | prerequisites assume setup complete |
| no linked roles | setup error | exclude | prerequisites assume roles extant |
| multiple passthrough flags | quantity variation | exclude | pattern tested at N=1 |
| many roles (N > 2) | quantity variation | exclude | pattern tested at N=2 |
| subtract all defaults | boundary | exclude | unusual, automated tests cover |

---

## conclusion

**edgecase coverage is sufficient for a playtest.**

| category | edge cases | covered | gaps |
|----------|------------|---------|------|
| input errors | 5 | 5 | none |
| system state errors | 3 | 0 | excluded (setup errors) |
| unusual but valid | 6 | 6 | none |
| passthrough variations | 1 | 1 | multiple flags (acceptable) |
| cardinality boundaries | 4 | 3 | many roles (acceptable) |
| state boundaries | 3 | 2 | subtract all (acceptable) |

**why gaps are acceptable:**
- playtest focuses on foreman verification of typical workflows
- quantity variations (N > 1) are mechanical
- setup errors are pre-condition failures, not feature behaviors
- automated tests cover the rest of the boundary cases

the playtest covers what a foreman needs to verify. edge cases beyond this are for automated tests.

---

## explicit articulation: why the coverage holds

### why input errors ARE covered

the playtest covers all common input errors because:

1. **typo (step 7):** this is the #1 user mistake. users will mistype role names. the playtest verifies the system catches it and suggests the correct name. this builds trust.

2. **empty string (step 8):** users might accidentally quote empty or forget to provide a value. the playtest verifies clear guidance.

3. **conflict (step 9):** this is a semantic error unique to the delta syntax. users might not realize `+foo,-foo` is contradictory. the playtest verifies the system detects it.

4. **idempotent subtract (step 10):** users might subtract a role not in defaults. this should not error — it's a no-op. the playtest verifies lenient behavior.

5. **idempotent append (step 11):** users might append a role already present. this should not duplicate. the playtest verifies correct deduplication.

these five cases cover the mental model gaps users have about the syntax.

### why system state errors are NOT covered

system state errors are excluded because:

1. **they are setup errors, not feature errors.** if `.agent/` is absent, the user hasn't run `rhx init`. the feature cannot work. this is like a test of a car without wheels.

2. **the foreman has already set up the repo.** playtest prerequisites say `.agent/` extant. the foreman verified this before start. a test of absence would require deliberate sabotage.

3. **automated tests handle these better.** automated tests can create/destroy directories, verify exact error messages, and test recovery paths. the foreman shouldn't need to break their repo.

### why boundary gaps are acceptable

the gaps are acceptable because:

1. **quantity variations (N > 2) are mechanical.** if comma-separated lists work for 2 items, they work for N items. the mechanism is the same. a test of N=2 proves the pattern.

2. **subtract all defaults is unusual.** users rarely want zero roles. the semantics are clear (empty config), but verify of it adds little foreman confidence. automated tests can catch regressions.

3. **multiple passthrough flags are mechanical.** if one flag passes through, all flags pass through. the mechanism doesn't change. a test of N=1 proves the pattern.

### the key insight

the playtest covers edge cases that affect **foreman confidence**, not edge cases that affect **code correctness**.

| foreman confidence | code correctness |
|--------------------|------------------|
| "does typo detection work?" | "does error message match exactly?" |
| "does conflict detection work?" | "is the conflict check order-independent?" |
| "does passthrough work?" | "do all 47 claude flags pass through?" |

the playtest verifies the former. automated tests verify the latter.