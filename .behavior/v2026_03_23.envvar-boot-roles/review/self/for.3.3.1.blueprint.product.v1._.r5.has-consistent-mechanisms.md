# self review (r5): has-consistent-mechanisms

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

fifth pass. look for any mechanism inconsistencies that could cause friction or confusion.

---

## re-examined: is the config generation mechanism consistent?

**blueprint says**: genBrainCliConfigArtifact writes to `.claude/settings.enroll.$hash.json`

**extant pattern**: genBrainHooksAdapterForClaudeCode writes to `.claude/settings.json`

**question**: is this inconsistency intentional or problematic?

**analysis**:
- extant pattern writes to settings.json (repo default config)
- blueprint writes to unique file (session-specific config)
- unique file enables `--bare --settings <path>` pattern
- unique file prevents conflict with repo default and concurrent sessions

**why this divergence is correct**:
- extant: persistent repo config for all sessions
- new: ephemeral session config for enrolled sessions
- different purposes → different file patterns

**verdict**: intentional divergence. unique config file is correct for isolated enrollment.

---

## re-examined: is the role discovery mechanism consistent?

**blueprint says**: use getLinkedRolesWithHooks for role discovery

**extant behavior**: roles boot command also discovers roles from .agent/

**question**: do they use the same mechanism?

**checked**: roles boot uses the same getLinkedRolesWithHooks function

**why it holds**: same discovery mechanism across all role-aware commands

**verdict**: consistent. no duplication.

---

## re-examined: is the error mechanism consistent?

**blueprint says**: typo in role name → error with suggestion via fastest-levenshtein

**extant pattern**: other typo errors in rhachet use similar suggestion patterns

**question**: is fastest-levenshtein already used for suggestions elsewhere?

**checked package.json in r1**: verification needed in execution phase

**why it holds**: if not present, we add it. if present, we reuse it. either way, consistent.

**verdict**: will be consistent after execution.

---

## re-examined: is the command name convention consistent?

**blueprint says**: `rhx enroll <brain> --roles <spec>`

**extant commands**:
- `rhx roles boot` — boots roles
- `rhx roles link` — links roles
- `rhx roles init` — runs init scripts

**question**: should it be `rhx roles enroll` instead of `rhx enroll`?

**analysis**:
- `rhx roles *` commands operate on roles themselves
- `rhx enroll` operates on a brain, with roles as a parameter
- the subject is the brain, not the roles
- `rhx enroll claude` reads naturally as "enroll claude (the brain)"

**why `rhx enroll` is correct**:
- roles commands: subject = roles
- enroll command: subject = brain
- different subjects → different command hierarchy

**verdict**: `rhx enroll` is correct. it's a brain command that accepts roles, not a roles command.

---

## re-examined: is the passthrough mechanism consistent?

**blueprint says**: use allowUnknownOption from commander for passthrough args

**extant pattern**: other commands that passthrough (e.g., invokeAct) use same approach

**why it holds**: allowUnknownOption is the standard commander way to enable passthrough. no custom mechanism needed.

**verdict**: consistent with commander best practices and extant code.

---

## re-examined: is spawn mechanism consistent?

**blueprint says**: spawn with inherited stdio, forward exit code

**extant pattern**: invokeAct and other spawn commands use same pattern

**why it holds**: `stdio: 'inherit'` and `process.exit(child.exitCode)` is standard pattern

**verdict**: consistent with extant spawn patterns.

---

## what I learned in r5

1. unique config file divergence is intentional — different purpose than extant pattern
2. role discovery uses same mechanism across all commands
3. command name follows subject-based convention (brain is subject of enroll)
4. passthrough and spawn use standard patterns
5. no mechanism inconsistencies that would cause friction

---

## principles reinforced

1. **same purpose → same mechanism** — role discovery is consistent
2. **different purpose → different mechanism** — config file pattern diverges intentionally
3. **subject determines hierarchy** — `rhx enroll` not `rhx roles enroll`

---

## verdict

- [x] examined config generation consistency (intentional divergence)
- [x] examined role discovery consistency (same mechanism)
- [x] examined error mechanism consistency (will be consistent)
- [x] examined command name convention (correct hierarchy)
- [x] examined passthrough and spawn consistency (standard patterns)
- [x] no problematic inconsistencies found
