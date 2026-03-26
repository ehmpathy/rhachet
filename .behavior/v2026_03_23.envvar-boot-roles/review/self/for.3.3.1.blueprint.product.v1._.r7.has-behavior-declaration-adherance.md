# self review (r7): has-behavior-declaration-adherance

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

check that the blueprint correctly implements (not just covers) the vision and criteria.

---

## vision syntax adherance

the vision defines this syntax:

| syntax | means |
|--------|-------|
| `role` | replace defaults with this role |
| `role1,role2` | replace defaults with these roles |
| `+role` | append to defaults |
| `-role` | subtract from defaults |
| `+role1,-role2` | append one, subtract another |

**does parseBrainCliEnrollmentSpec implement this correctly?**

the blueprint says:
- detect mode (replace vs delta)
- parse ops (split by comma, detect +/-)

**how does it detect mode?**

- if any op has + or - prefix → delta mode
- if all ops are bare names → replace mode

**is this correct per vision?**

- `mechanic` → bare name → replace mode ✓
- `mechanic,driver` → two bare names → replace mode ✓
- `+architect` → has + → delta mode ✓
- `-driver` → has - → delta mode ✓
- `+architect,-driver` → has +/- → delta mode ✓

the detection logic matches the vision's syntax.

---

## criteria adherance: usecase by usecase

### usecase.1 replace default roles

**criteria**: `--roles mechanic` → boots with ONLY mechanic

**blueprint implementation**:
1. parseBrainCliEnrollmentSpec detects bare name → mode=replace
2. computeBrainCliEnrollment in replace mode: ops become final roles
3. genBrainCliConfigArtifact generates hooks for mechanic only
4. enrollBrainCli spawns with `--bare --settings <path>`

**is this correct?** ✓ replace mode uses only specified roles, `--bare` rejects defaults.

### usecase.7 error: no --roles flag

**criteria**: no `--roles` flag → error "--roles is required"

**blueprint implementation**:
1. invokeEnroll checks for `--roles` flag (required)
2. if absent, throws error: "--roles is required"

**is this correct?** ✓ `--roles` is required per vision. no fallback to defaults.

### usecase.8 typo in role name

**criteria**: `--roles mechnic` → error with suggestion "did you mean 'mechanic'?"

**blueprint implementation**:
1. parseBrainCliEnrollmentSpec parses spec (succeeds)
2. computeBrainCliEnrollment validates against linked roles
3. computeBrainCliEnrollment uses fastest-levenshtein for suggestion

**is this correct?** ✓ validation happens in computeBrainCliEnrollment, not parse.

### usecase.10 conflict in ops

**criteria**: `--roles +mechanic,-mechanic` → error "cannot both add and remove"

**blueprint implementation**:
1. parseBrainCliEnrollmentSpec detects +mechanic and -mechanic for same role
2. parseBrainCliEnrollmentSpec throws BadRequestError

**is this correct?** ✓ conflict detection in parser before compute.

### usecase.15 rejects default configs

**criteria**: global and repo configs NOT loaded

**blueprint implementation**:
1. genBrainCliConfigArtifact creates unique file: `.claude/settings.enroll.$hash.json`
2. enrollBrainCli spawns with `--bare --settings <path>`
3. `--bare` rejects global `~/.claude/settings.json` and repo `.claude/settings.json`

**is this correct?** ✓ `--bare` ensures only the custom config is loaded.

### usecase.16 generates unique config file

**criteria**: unique config per session

**blueprint implementation**:
1. genBrainCliConfigArtifact generates hash from manifest
2. writes to `.claude/settings.enroll.$hash.json`

**is this correct?** ✓ unique hash prevents collision with concurrent sessions.

---

## hard requirement adherance

| requirement | vision says | blueprint mechanism | verdict |
|-------------|-------------|---------------------|---------|
| `--roles` required | no fallback | invokeEnroll validates required | ✓ |
| custom config | unique name | genBrainCliConfigArtifact with $hash | ✓ |
| reject global | `--bare` flag | enrollBrainCli uses `--bare` | ✓ |
| reject repo | `--settings` only | enrollBrainCli uses `--bare --settings <path>` | ✓ |

all hard requirements are adhered to correctly.

---

## key decision adherance

### decision: spawn with --bare --settings

**vision says**: enrolled brain boots with ONLY the specified roles' hooks

**blueprint says**: `claude --bare --settings .claude/settings.enroll.$hash.json`

**why this is correct**:
- `--bare` — skips auto-discovery of hooks, skills, MCP, CLAUDE.md
- `--settings <path>` — loads settings from the specified file only

this ensures complete isolation: the brain sees only the hooks from the specified roles.

### decision: exec vs spawn

**blueprint says**: spawn with inherited stdio, forward exit code

**why spawn is correct**:
- spawn with `stdio: 'inherit'` allows interactive brain session
- `process.exit(child.exitCode)` forwards exit code to caller

this matches typical CLI wrapper behavior.

---

## verdict

- [x] syntax detection matches vision
- [x] replace mode implements correctly
- [x] usecase.7 is error (not defaults) — correctly implemented
- [x] usecase.15/16 unique config and reject defaults — correctly implemented
- [x] hard requirements are all adhered to
- [x] spawn mechanism correctly uses `--bare --settings`
- [x] no misinterpretations found

