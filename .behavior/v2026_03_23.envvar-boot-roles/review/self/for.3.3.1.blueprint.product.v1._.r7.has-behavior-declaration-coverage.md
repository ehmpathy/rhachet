# self review (r7): has-behavior-declaration-coverage

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

seventh pass. deeper verification of behavior declaration coverage with fresh eyes.

---

## re-examined: hard requirements coverage

the vision has hard requirements that are non-negotiable:

| hard requirement | vision says | blueprint mechanism |
|------------------|-------------|---------------------|
| `--roles` required | no fallback to defaults | invokeEnroll validates required flag |
| custom config file | unique name per session | genBrainCliConfigArtifact with $hash |
| reject global config | `--bare` flag | enrollBrainCli uses `--bare` |
| reject repo default | `--settings <path>` only | enrollBrainCli uses `--bare --settings <path>` |

**why this holds**: the spawn mechanism is `claude --bare --settings <path>`, which:
- `--bare` — skips all default config discovery
- `--settings <path>` — loads only the generated config

this ensures the brain boots with ONLY the specified roles' hooks.

---

## re-examined: all 16 usecases coverage

| usecase | requirement | blueprint mechanism |
|---------|-------------|---------------------|
| 1 | replace default | parseBrainCliEnrollmentSpec mode=replace |
| 2 | append | parseBrainCliEnrollmentSpec mode=delta + action=add |
| 3 | subtract | parseBrainCliEnrollmentSpec mode=delta + action=remove |
| 4 | mixed | parseBrainCliEnrollmentSpec mode=delta + mixed ops |
| 5 | explicit multi | parseBrainCliEnrollmentSpec mode=replace + multiple names |
| 6 | resume with roles | allowUnknownOption passthrough |
| 7 | error: no --roles | invokeEnroll requires --roles flag |
| 8 | error: typo | computeBrainCliEnrollment + fastest-levenshtein |
| 9 | error: empty | parseBrainCliEnrollmentSpec validates non-empty |
| 10 | error: conflict | parseBrainCliEnrollmentSpec validates no +foo,-foo |
| 11 | error: no .agent/ | invokeEnroll checks agentDir exists |
| 12 | idempotent - | computeBrainCliEnrollment delta mode |
| 13 | idempotent + | computeBrainCliEnrollment delta mode |
| 14 | passthrough | allowUnknownOption |
| 15 | rejects defaults | enrollBrainCli uses `--bare --settings <path>` |
| 16 | unique config | genBrainCliConfigArtifact with hash |

all 16 usecases map to specific mechanisms.

---

## re-examined: domain objects and contracts

| domain object | shape | location |
|---------------|-------|----------|
| BrainCliEnrollmentSpec | { mode, ops } | domain.objects/ |
| BrainCliEnrollmentOperation | { action, role } | domain.objects/ |
| BrainCliEnrollmentManifest | { brain, roles } | domain.objects/ |

| operation | contract | location |
|-----------|----------|----------|
| parseBrainCliEnrollmentSpec | string → BrainCliEnrollmentSpec | domain.operations/enroll/ |
| computeBrainCliEnrollment | spec + defaults → BrainCliEnrollmentManifest | domain.operations/enroll/ |
| genBrainCliConfigArtifact | manifest → { configPath } | domain.operations/enroll/ |
| enrollBrainCli | brain + configPath + args → spawn | domain.operations/enroll/ |
| invokeEnroll | CLI command handler | contract/cli/ |

all contracts are specified with correct current names.

---

## edge cases verified

| edge case | mechanism |
|-----------|-----------|
| `--roles ""` | parseBrainCliEnrollmentSpec throws BadRequestError |
| `--roles +foo,-foo` | parseBrainCliEnrollmentSpec throws BadRequestError |
| unknown role name | computeBrainCliEnrollment returns error with suggestion |
| no .agent/ directory | invokeEnroll throws BadRequestError |
| role without hooks | silent skip (role may contribute briefs only) |
| multiple concurrent sessions | unique hash in config filename prevents collision |

---

## principles reinforced

1. **hard requirements first** — `--roles` required, unique config, reject defaults
2. **explicit over implicit** — no hidden default roles
3. **isolation** — unique config file per session
4. **traceability** — every usecase maps to mechanism

---

## verdict

- [x] verified hard requirements (--roles required, unique config, reject defaults)
- [x] verified all 16 blackbox usecases with mechanisms
- [x] verified all domain objects with current names
- [x] verified all operations with current names
- [x] verified edge cases
- [x] no gaps found

