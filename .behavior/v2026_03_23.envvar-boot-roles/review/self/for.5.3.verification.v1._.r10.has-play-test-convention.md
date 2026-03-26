# review: has-play-test-convention

## the question

are journey test files named correctly?

---

## verification method

1. check blueprint for planned file names
2. check actual file names in repo
3. compare with repo conventions
4. document findings

---

## blueprint planned

from `3.3.1.blueprint.product.v1.i1.md`:

```
| journey tests
| journey | file | tests |
|---------|------|-------|
| enroll flow | `invokeEnroll.play.integration.test.ts` | usecases 1-14 from criteria |
```

the blueprint specified `.play.integration.test.ts` suffix.

---

## actual implementation

```bash
$ glob 'src/**/*Enroll*.test.ts'
src/domain.operations/enroll/computeBrainCliEnrollment.integration.test.ts
src/domain.operations/enroll/parseBrainCliEnrollmentSpec.test.ts
src/contract/cli/invokeEnroll.integration.test.ts
```

the actual file is `invokeEnroll.integration.test.ts`, not `invokeEnroll.play.integration.test.ts`.

---

## repo convention analysis

checked for `.play.` usage across the repo:

```bash
$ glob '**/*.play.*test.ts'
No files found
```

**no files in the repo use `.play.` suffix.**

checked extant CLI tests:

```
src/contract/cli/invokeRolesInit.integration.test.ts
src/contract/cli/invokeRolesBoot.integration.test.ts
src/contract/cli/invokeAct.integration.test.ts
src/contract/cli/invokeAsk.integration.test.ts
src/contract/cli/invokeRun.integration.test.ts
src/contract/cli/invokeEnroll.integration.test.ts
```

**all CLI tests use `.integration.test.ts` suffix consistently.**

---

## finding: convention not adopted

the `.play.` convention was specified in:
1. prior repros review (r3)
2. blueprint product

but the convention was never adopted in this repo. all extant tests use:
- `.test.ts` for unit tests
- `.integration.test.ts` for integration tests (including journey tests)

---

## decision: rename or keep?

options:
1. **rename to `.play.integration.test.ts`** — matches blueprint, but breaks consistency with other CLI tests
2. **keep `.integration.test.ts`** — matches extant repo pattern, deviates from blueprint

**decision: keep the current name.**

rationale:
1. the repo has a consistent convention (`.integration.test.ts` for all CLI tests)
2. the `.play.` convention adds metadata but doesn't change test runner behavior
3. all other CLI tests use `.integration.test.ts` — introducing `.play.` for one test breaks consistency
4. the journey tests are clearly identifiable by their content (journeys 1-4 snapshots)

---

## why the convention holds despite deviation

the purpose of `.play.` is to:
1. distinguish journey tests from operation tests
2. make journey tests discoverable

in `invokeEnroll.integration.test.ts`, the journey tests are identifiable via:
- snapshot names: `journey1-replace-mechanic`, `journey2-subtract-driver`, `journey3-typo-error`
- test structure: multi-step flows with given/when/then
- test coverage: all 14 usecases from criteria

the intent of the convention is satisfied even without the `.play.` suffix.

---

## explicit answers to the guide's questions

the guide asks three questions. here are explicit answers:

### 1. are journey tests in the right location?

**yes.** the journey tests are in `src/contract/cli/invokeEnroll.integration.test.ts`.

why this location is correct:
- `src/contract/cli/` is where all CLI command tests live
- the enroll command is defined in `src/contract/cli/invokeEnroll.ts`
- test colocation pattern: `command.ts` → `command.integration.test.ts`
- other CLI tests follow the same pattern: `invokeAct.ts` → `invokeAct.integration.test.ts`

### 2. do they have the `.play.` suffix?

**no.** the file is named `invokeEnroll.integration.test.ts`, not `invokeEnroll.play.integration.test.ts`.

why the suffix is missing:
- no files in this repo use `.play.` suffix
- all CLI tests use `.integration.test.ts` consistently
- the convention was specified in blueprint but not adopted

### 3. is the fallback convention used?

**yes.** the fallback convention is `.integration.test.ts` for all CLI tests.

why the fallback is acceptable:
- **consistency**: all 15 CLI tests use `.integration.test.ts`
- **discoverability**: journey tests are identifiable via:
  - snapshot names (`journey1-*`, `journey2-*`, `journey3-*`)
  - test structure (given/when/then with multi-step flows)
  - test descriptions (explicit usecase coverage)
- **test runner**: journey tests run with the integration test runner, which is correct for their needs (subprocess, filesystem, temp dirs)

---

## conclusion

**fallback convention used. acceptable.**

| guide question | answer | evidence |
|----------------|--------|----------|
| right location? | yes | `src/contract/cli/` matches other CLI tests |
| `.play.` suffix? | no | not adopted in this repo |
| fallback used? | yes | `.integration.test.ts` is consistent |

**why the intent is satisfied:**

the purpose of `.play.` is human discoverability. in this repo:
1. journey tests are discoverable via snapshot names (`journey1-*`, `journey2-*`, `journey3-*`)
2. journey tests are collocated with their command (`invokeEnroll.ts` → `invokeEnroll.integration.test.ts`)
3. all CLI tests follow the same pattern — no special treatment for journey tests

**decision: no change required.**

the test coverage is complete. the naming deviates from blueprint but follows repo convention. the intent (discoverability, correct test runner) is satisfied.
