# self-review: has-behavior-declaration-coverage

## vision requirements check

### requirement.1 = tests fetch keys from keyrack automatically

| vision statement | "tests fetch keys from keyrack automatically. unlock once per session. no more source incantations." |
|------------------|-----|
| blueprint coverage | jest.integration.env.ts spawns `rhx keyrack get --for repo --env test --json --owner ehmpath` |
| verdict | **covered** |

---

### requirement.2 = failfast with ConstraintError when keyrack locked

| vision statement | "if the keyrack is not unlocked, it can just failfast and tell the caller to unlock" |
|------------------|-----|
| blueprint coverage | "if locked → throw ConstraintError with unlock command" |
| verdict | **covered** |

---

### requirement.3 = hardcode --owner ehmpath

| vision statement | "hardcoded to --owner ehmpath because we expect only ehmpaths to work here" |
|------------------|-----|
| blueprint coverage | command shows `--owner ehmpath`, comments show `.note = hardcoded to --owner ehmpath` |
| verdict | **covered** |

---

### requirement.4 = prikey auto-discovery from ~/.ssh/$owner

| vision statement | "auto-discover prikey from ~/.ssh/$owner when --prikey not specified" |
|------------------|-----|
| blueprint coverage | getAllAvailableIdentities extension: "check ~/.ssh/$owner first" |
| verdict | **covered** |

---

### requirement.5 = CI passthrough via os.envvar

| vision statement | "CI environments — keyrack passthrough via os.envvar, no unlock needed" |
|------------------|-----|
| blueprint coverage | "try CI passthrough first (check process.env for required keys)" + "if keys present → done" |
| verdict | **covered** |

---

### requirement.6 = eliminate use.apikeys.sh

| vision statement | "files to eliminate: .agent/repo=.this/role=any/skills/use.apikeys.sh" |
|------------------|-----|
| blueprint coverage | filediff tree shows `[-] use.apikeys.sh # delete legacy shell file` |
| verdict | **covered** |

---

### requirement.7 = eliminate use.apikeys.json

| vision statement | "files to eliminate: .agent/repo=.this/role=any/skills/use.apikeys.json" |
|------------------|-----|
| blueprint coverage | filediff tree shows `[-] use.apikeys.json # delete legacy config` |
| verdict | **covered** |

---

### requirement.8 = modify jest.integration.env.ts

| vision statement | "jest.integration.env.ts — spawn rhx keyrack get instead of read json file" |
|------------------|-----|
| blueprint coverage | filediff tree shows `[~] jest.integration.env.ts # replace apikeys check with keyrack get` |
| verdict | **covered** |

---

### requirement.9 = modify jest.acceptance.env.ts

| vision statement | "jest.acceptance.env.ts — same changes as jest.integration.env.ts" |
|------------------|-----|
| blueprint coverage | filediff tree shows `[~] jest.acceptance.env.ts # replace apikeys check with keyrack get` |
| verdict | **covered** |

---

## criteria check

### usecase.1 = run integration tests

| criterion | blueprint coverage | verdict |
|-----------|-------------------|---------|
| keyrack unlocked → tests run | inject secrets into process.env | covered |
| keyrack locked → failfast with ConstraintError | throw ConstraintError with unlock command | covered |
| keys absent → failfast with set commands | throw ConstraintError with absent list and fixes | covered |

---

### usecase.2 = run acceptance tests

| criterion | blueprint coverage | verdict |
|-----------|-------------------|---------|
| same pattern as integration | jest.acceptance.env.ts marked `[~] same pattern as integration` | covered |

---

### usecase.3 = CI environment

| criterion | blueprint coverage | verdict |
|-----------|-------------------|---------|
| keys via os.envvar → tests run | CI passthrough first check | covered |
| no keyrack unlock required | `if keysPresent return` — done before keyrack call | covered |

---

### usecase.4 = prikey auto-discovery

| criterion | blueprint coverage | verdict |
|-----------|-------------------|---------|
| --prikey not specified → auto-discover from ~/.ssh/$owner | getAllAvailableIdentities extension with owner param | covered |

---

### usecase.5 = elimination of legacy pattern

| criterion | blueprint coverage | verdict |
|-----------|-------------------|---------|
| use.apikeys.sh does not exist | filediff shows delete | covered |
| use.apikeys.json does not exist | filediff shows delete | covered |
| no source commands in package.json | package.json not modified (no source commands to remove) | covered |
| no references in jest.*.ts files | jest.*.env.ts replacement removes references | covered |

---

## summary

| category | total | covered | gaps |
|----------|-------|---------|------|
| vision requirements | 9 | 9 | 0 |
| criteria usecases | 5 | 5 | 0 |

**no gaps found**. all vision requirements and criteria are addressed by the blueprint.
