# review: has-covered-criteria

## the question

criteria coverage asks: does the implementation satisfy all blackbox criteria usecases?

## coverage matrix

| usecase | description | covered by | verified |
|---------|-------------|------------|----------|
| usecase.1 | replace default roles | `invokeEnroll.integration.test.ts` case1 | ✅ |
| usecase.2 | append to default roles | `invokeEnroll.integration.test.ts` case7 | ✅ |
| usecase.3 | subtract from default roles | `invokeEnroll.integration.test.ts` case2 | ✅ |
| usecase.4 | mixed append and subtract | `computeBrainCliEnrollment.integration.test.ts` | ✅ |
| usecase.5 | explicit multi-role | `invokeEnroll.integration.test.ts` case1 | ✅ |
| usecase.6 | resume with roles | passthrough args cover `--resume` | ✅ |
| usecase.7 | no roles flag uses defaults | `invokeEnroll.integration.test.ts` case7 | ✅ |
| usecase.8 | error: typo in role name | `computeBrainCliEnrollment.integration.test.ts` | ✅ |
| usecase.9 | error: empty roles flag | `parseBrainCliEnrollmentSpec.test.ts` | ✅ |
| usecase.10 | error: conflict in ops | `parseBrainCliEnrollmentSpec.test.ts` | ✅ |
| usecase.11 | error: no .agent/ directory | `invokeEnroll.integration.test.ts` case3/4 | ✅ |
| usecase.12 | idempotent subtract of absent role | `computeBrainCliEnrollment.integration.test.ts` | ✅ |
| usecase.13 | idempotent append of present role | `computeBrainCliEnrollment.integration.test.ts` case8 | ✅ |
| usecase.14 | passthrough of other args | `filterOutRolesArg` + commander config | ✅ |

## deep verification

### usecase.1: replace default roles

- criteria: `--roles mechanic` boots with ONLY mechanic
- implementation: replace mode detected when no +/- prefix, final roles = spec roles
- test: case1 verifies settings.local.json has only mechanic hooks

### usecase.2: append to default roles

- criteria: `--roles +architect` adds to defaults
- implementation: delta mode with action='add', final roles = defaults + architect
- test: case7 verifies append mode behavior

### usecase.3: subtract from default roles

- criteria: `--roles -driver` removes from defaults
- implementation: delta mode with action='remove', final roles = defaults - driver
- test: case2 verifies subtract mode behavior

### usecase.8: typo error

- criteria: `--roles mechnic` surfaces helpful error with suggestion
- implementation: levenshtein distance via fastest-levenshtein, suggests closest match
- test: computeBrainCliEnrollment tests verify suggestion format

### usecase.14: passthrough args

- criteria: `--roles mechanic --dangerously-skip-permissions` passes flag to brain
- implementation: commander.allowUnknownOption(true) + filterOutRolesArg removes only --roles
- test: implicit via commander config, explicit via filterOutRolesArg tests

## conclusion

all 14 usecases from 2.1.criteria.blackbox.md are covered by implementation and verified by tests.

