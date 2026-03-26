# self review (r6): has-behavior-declaration-coverage

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

check that every requirement from vision and criteria is addressed in the blueprint.

---

## vision requirements check

### usecases from vision

| usecase | vision says | blueprint coverage |
|---------|-------------|-------------------|
| focused code work | `rhx enroll claude --roles mechanic` | ✓ invokeEnroll + computeBrainCliEnrollment |
| ux review | `rhx enroll claude --roles ergonomist` | ✓ same mechanism |
| default minus noise | `rhx enroll claude --roles -driver` | ✓ delta mode in parseBrainCliEnrollmentSpec |
| default plus specialist | `rhx enroll claude --roles +architect` | ✓ delta mode in parseBrainCliEnrollmentSpec |
| multi-role combo | `rhx enroll claude --roles mechanic,ergonomist` | ✓ replace mode in parseBrainCliEnrollmentSpec |
| resume with roles | `rhx enroll claude --roles mechanic --resume` | ✓ passthrough args via allowUnknownOption |

all vision usecases are covered.

### syntax from vision

| syntax | vision says | blueprint coverage |
|--------|-------------|-------------------|
| `role` | replace defaults with this role | ✓ replace mode |
| `role1,role2` | replace defaults with these roles | ✓ replace mode |
| `+role` | append to defaults | ✓ delta mode, action=add |
| `-role` | subtract from defaults | ✓ delta mode, action=remove |
| `+role1,-role2` | append one, subtract another | ✓ delta mode, mixed ops |

all syntax variants are covered.

### hard requirement from vision

| requirement | vision says | blueprint coverage |
|-------------|-------------|-------------------|
| `--roles` required | no fallback to defaults | ✓ invokeEnroll validates required |
| custom config file | unique name per session | ✓ genBrainCliConfigArtifact unique hash |
| reject global config | `--bare` flag | ✓ enrollBrainCli uses `--bare` |
| reject repo default | `--bare` + custom `--settings` | ✓ enrollBrainCli uses `--bare --settings <path>` |

all hard requirements are covered.

---

## blackbox criteria check

| usecase | criteria | blueprint coverage |
|---------|----------|-------------------|
| usecase.1 | replace default roles | ✓ parseBrainCliEnrollmentSpec replace mode + computeBrainCliEnrollment |
| usecase.2 | append to default roles | ✓ parseBrainCliEnrollmentSpec delta mode + action=add |
| usecase.3 | subtract from default roles | ✓ parseBrainCliEnrollmentSpec delta mode + action=remove |
| usecase.4 | mixed append and subtract | ✓ parseBrainCliEnrollmentSpec delta mode + mixed ops |
| usecase.5 | explicit multi-role | ✓ parseBrainCliEnrollmentSpec replace mode |
| usecase.6 | resume with roles | ✓ allowUnknownOption passthrough |
| usecase.7 | error: no roles flag | ✓ invokeEnroll requires --roles |
| usecase.8 | error: typo in role name | ✓ computeBrainCliEnrollment validates + fastest-levenshtein |
| usecase.9 | error: empty roles flag | ✓ parseBrainCliEnrollmentSpec validates empty |
| usecase.10 | error: conflict in ops | ✓ parseBrainCliEnrollmentSpec validates conflict |
| usecase.11 | error: no .agent/ directory | ✓ invokeEnroll checks agentDir |
| usecase.12 | idempotent subtract of absent | ✓ computeBrainCliEnrollment delta mode |
| usecase.13 | idempotent append of present | ✓ computeBrainCliEnrollment delta mode |
| usecase.14 | passthrough of other args | ✓ allowUnknownOption |
| usecase.15 | rejects default configs | ✓ enrollBrainCli uses `--bare --settings <path>` |
| usecase.16 | generates unique config file | ✓ genBrainCliConfigArtifact with hash |

all 16 usecases are covered in the blueprint.

---

## blueprint criteria check

| requirement | blueprint criteria | blueprint coverage |
|-------------|-------------------|-------------------|
| parser contract | exposes parseBrainCliEnrollmentSpec | ✓ in domain.operations/enroll/ |
| BrainCliEnrollmentSpec shape | { mode, ops } | ✓ in domain.objects/ |
| BrainCliEnrollmentOperation shape | { action, role } | ✓ in domain.objects/ |
| computation contract | exposes computeBrainCliEnrollment | ✓ in domain.operations/enroll/ |
| BrainCliEnrollmentManifest shape | { brain, roles } | ✓ in domain.objects/ |
| config generator contract | exposes genBrainCliConfigArtifact | ✓ in domain.operations/enroll/ |
| brain spawner contract | exposes enrollBrainCli | ✓ in domain.operations/enroll/ |
| composition flow | parser → computation → generator → spawner | ✓ documented in composition flow |

all blueprint criteria requirements are covered.

---

## test coverage check

| test type | criteria | blueprint coverage |
|-----------|----------|-------------------|
| unit tests | parseBrainCliEnrollmentSpec all modes/errors | ✓ parseBrainCliEnrollmentSpec.test.ts |
| integration tests | computeBrainCliEnrollment discovery/typo | ✓ computeBrainCliEnrollment.integration.test.ts |
| integration tests | genBrainCliConfigArtifact config | ✓ genBrainCliConfigArtifact.integration.test.ts |
| integration tests | invokeEnroll command/required flag | ✓ invokeEnroll.integration.test.ts |
| journey tests | usecases 1-16 | ✓ invokeEnroll.play.integration.test.ts |

all test coverage requirements are specified.

---

## verdict

- [x] all vision usecases are addressed
- [x] all syntax variants are covered
- [x] all hard requirements (--roles required, unique config, reject defaults) are covered
- [x] all 16 blackbox criteria usecases are covered
- [x] all blueprint criteria requirements are covered
- [x] all test coverage requirements are specified
- [x] no gaps found

