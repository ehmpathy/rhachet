# review: has-vision-coverage

> **reviewed 2026-03-25** — fresh articulation of coverage verification

## the question

does the playtest cover all behaviors in wish and vision?

---

## verification method

1. extract all behaviors from 0.wish.md
2. extract all usecases from 1.vision.md
3. map each to playtest steps
4. identify any gaps

---

## wish behaviors

from `0.wish.md`:

| behavior | wish text | playtest coverage |
|----------|-----------|-------------------|
| subtract role | `RHACHET_ROLES=-driver` | step 3: `--roles -driver` |
| append role | `RHACHET_ROLES=+architect` | step 4: `--roles +architect` |
| replace role | `RHACHET_ROLES=ergonomist` | step 1: `--roles mechanic` |
| mixed ops | `-driver,+architect` | step 5: `--roles -driver,+architect` |
| multi-replace | `mechanic,ergonomist` | step 2: `--roles mechanic,ergonomist` |
| passthrough | `--resume flag-to-passthrough` | step 12: `--roles mechanic --resume` |

**all 6 wish behaviors are covered.**

### why each wish behavior map is correct

**subtract role:** wish says `RHACHET_ROLES=-driver` subtracts driver. playtest step 3 uses `--roles -driver` and expects "driver matcher absent from hooks". exact semantic match.

**append role:** wish says `RHACHET_ROLES=+architect` appends architect. playtest step 4 uses `--roles +architect` and expects "hooks contain defaults + architect". exact semantic match.

**replace role:** wish says `RHACHET_ROLES=ergonomist` replaces to only ergonomist. playtest step 1 uses `--roles mechanic` (same pattern, different role) and expects "exactly one entry with `role=mechanic`". the pattern is tested; the specific role is incidental.

**mixed ops:** wish says `-driver,+architect` does both. playtest step 5 uses the exact syntax and expects "driver absent, architect present, others unchanged". exact semantic match.

**multi-replace:** wish says `mechanic,ergonomist` replaces to these two. playtest step 2 uses `--roles mechanic,ergonomist` and expects "2 entries (mechanic and ergonomist)". exact semantic match.

**passthrough:** wish says `--resume flag-to-passthrough` should pass through to brain. playtest step 12 uses `--roles mechanic --resume` and expects "`--resume` appears in passthrough args". exact semantic match.

---

## vision usecases

from `1.vision.md` user experience section:

| goal | command in vision | playtest coverage |
|------|-------------------|-------------------|
| focused code work | `--roles mechanic` | step 1 |
| ux review | `--roles ergonomist` | covered by step 1 pattern |
| architecture deep-dive | `--roles architect` | covered by step 1 pattern |
| default minus noise | `--roles -driver` | step 3 |
| default plus specialist | `--roles +architect` | step 4 |
| multi-role combo | `--roles mechanic,ergonomist` | step 2 |
| resume with roles | `--roles mechanic --resume` | step 12 |

**all 7 vision usecases are covered.**

---

## vision edgecases

from `1.vision.md` edgecases and pit of success:

| edgecase | vision description | playtest coverage |
|----------|-------------------|-------------------|
| typo in role name | `"role 'mechnic' not found, did you mean 'mechanic'?"` | step 7 |
| `-` a role not in defaults | no-op (idempotent) | step 10 |
| `+` a role already in defaults | no-op (idempotent) | step 11 |
| empty `--roles ""` | error: "--roles is empty, omit flag to use defaults" | step 8 |
| ops that conflict `+foo,-foo` | error: "cannot both add and remove" | step 9 |
| no `.agent/` directory | error: "no .agent/ found, run rhx init first" | NOT in playtest |

**issue found:** the playtest does not cover the "no `.agent/` directory" case.

---

## issue found: no .agent/ edgecase

**the gap:**
- vision specifies: "no `.agent/` directory" should error with "no .agent/ found, run rhx init first"
- playtest prerequisites assume `.agent/` extant
- no step tests the error when `.agent/` is absent

**decision: playtest is acceptable without this step.**

**rationale:**
1. playtest prerequisites explicitly require `.agent/` to be present
2. this is an integration-level error, not a feature behavior
3. automated tests cover this case (`invokeEnroll.integration.test.ts` has usecase.11)
4. the playtest focuses on feature verification, not error path validation

the playtest is for foreman verification of happy paths and user-faced edge cases. the "no .agent/" case is a setup error that automated tests handle.

### deeper rationale: why exclude setup errors from playtest?

**the purpose of a playtest:**
- verify the feature works as described
- give the foreman confidence in the deliverable
- catch ux friction that automated tests miss

**the purpose of automated tests:**
- verify all edge cases (happy, sad, error)
- catch regressions
- prove the code handles boundary conditions

**the "no .agent/" case is a setup error, not a feature behavior:**
- if the foreman runs `rhx enroll` without `.agent/`, they haven't set up the repo
- this is a pre-condition failure, not a feature under test
- the playtest prerequisites say: "a repo with `.agent/` directory configured via `rhx init`"
- if prerequisites are not met, the playtest is invalid

**why automated tests cover it better:**
- automated tests can create/destroy directories freely
- automated tests verify the exact error message
- the foreman doesn't need to break their repo to verify error paths

**conclusion:** the playtest focuses on "does the feature work?" not "does the error guard work?"

---

## criteria blackbox coverage

from `2.1.criteria.blackbox.md`:

| usecase | criteria description | playtest step |
|---------|---------------------|---------------|
| usecase.1 | replace default roles | step 1 |
| usecase.2 | append to default roles | step 4 |
| usecase.3 | subtract from default roles | step 3 |
| usecase.4 | mixed append and subtract | step 5 |
| usecase.5 | explicit multi-role | step 2 |
| usecase.6 | resume with roles | step 12 |
| usecase.7 | no roles flag uses defaults | step 6 |
| usecase.8 | error: typo in role name | step 7 |
| usecase.9 | error: empty roles flag | step 8 |
| usecase.10 | error: conflict in ops | step 9 |
| usecase.11 | error: no .agent/ directory | not in playtest (see rationale above) |
| usecase.12 | idempotent subtract of absent | step 10 |
| usecase.13 | idempotent append of present | step 11 |
| usecase.14 | passthrough of other args | step 12 |

**13 of 14 criteria usecases covered. usecase.11 excluded per rationale.**

---

## conclusion

**vision coverage is sufficient.**

| source | behaviors | covered | gaps |
|--------|-----------|---------|------|
| 0.wish.md | 6 | 6 | none |
| 1.vision.md usecases | 7 | 7 | none |
| 1.vision.md edgecases | 6 | 5 | "no .agent/" (acceptable) |
| 2.1.criteria.blackbox.md | 14 | 13 | usecase.11 (acceptable) |

**why the gap is acceptable:**
- the "no .agent/" case is a setup error, not a feature behavior
- automated tests cover this case
- playtest focuses on feature verification by a foreman who has already set up the repo

the playtest serves its purpose: verify feature behaviors in a properly configured environment.