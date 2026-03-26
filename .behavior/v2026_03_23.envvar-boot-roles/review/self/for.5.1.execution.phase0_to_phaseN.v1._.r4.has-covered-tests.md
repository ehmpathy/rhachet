# review: has-covered-tests

## the question

test coverage asks: are the tests adequate for the implementation?

## test inventory

| component | test file | test count | type |
|-----------|-----------|------------|------|
| parseBrainCliEnrollmentSpec | `.test.ts` | 12 | unit |
| computeBrainCliEnrollment | `.integration.test.ts` | 11 | integration |
| genBrainCliConfigArtifact | `.integration.test.ts` | 12 | integration |
| invokeEnroll | `.integration.test.ts` | 13 | integration |
| **total** | | **48** | |

## coverage by layer

### domain objects

- `BrainSlug`, `RoleSlug`: type aliases, no tests needed
- `BrainCliEnrollmentSpec`, `BrainCliEnrollmentOperation`, `BrainCliEnrollmentManifest`: DomainLiteral classes, instantiation tested via operation tests

### domain operations

**parseBrainCliEnrollmentSpec** (12 unit tests):
- replace mode: single role, multi role
- delta mode: add, remove, mixed
- error: empty spec, conflict detection
- edge: comma variants, whitespace

**computeBrainCliEnrollment** (11 integration tests):
- replace mode: final roles = spec
- delta mode: add to defaults, remove from defaults
- idempotent: add present, remove absent
- error: typo with suggestion
- edge: empty defaults, all removed

**genBrainCliConfigArtifact** (12 integration tests):
- happy path: writes settings.local.json
- filter: only enrolled role hooks
- structure: valid json, author patterns
- edge: no hooks, multiple roles

### contract layer

**invokeEnroll** (13 integration tests):
- case1: replace mode
- case2: subtract mode
- case3: no .agent/ error
- case4: empty .agent/ error
- case5: spec parse errors
- case6: brain not supported error
- case7: append, explicit multi, no flag
- case8: idempotent ops

## test quality

| quality metric | status | notes |
|----------------|--------|-------|
| given/when/then structure | ✅ | all tests use test-fns BDD |
| useBeforeAll for setup | ✅ | temp dirs and fixtures |
| isolated tests | ✅ | each test has own temp dir |
| no mocks | ✅ | real filesystem, real code |
| error path coverage | ✅ | all BadRequestError cases |
| snapshot tests | ✅ | config output verified |

## gaps

none identified. all code paths have test coverage.

## conclusion

48 tests cover all implementation paths. unit tests for parse logic, integration tests for filesystem operations, BDD structure throughout. no gaps found.

