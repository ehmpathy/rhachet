# self review (r8): has-behavior-declaration-adherance

> **note: `--mode plan` was not implemented.** this review mentions `--mode plan` in the context of design decision review. the feature was proposed in research documents but excluded as YAGNI in execution. actual tests verify behavior via `program.parseAsync` and config file inspection.

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

eighth pass. deeper verification of implementation correctness with fresh eyes.

---

## re-examined: mode detection edge cases

the vision says bare names trigger replace, +/- trigger delta.

**what about mixed: `mechanic,+driver`?**

this is bare name + prefixed name. which mode?

**analysis**:
- this spec has both bare and prefixed ops
- parseBrainCliEnrollmentSpec should detect this as invalid
- or: treat any +/- as delta mode, bare names become action=add

**checked criteria**: no explicit usecase for mixed bare+prefixed

**decision needed**: the blueprint should clarify this edge case.

**but is this a blocker?**

the vision shows only these patterns:
- `role` — replace
- `role1,role2` — replace
- `+role` — delta
- `-role` — delta
- `+role1,-role2` — delta

mixed `mechanic,+driver` is not in the vision. it's undefined behavior.

**verdict**: not a blocker. the blueprint can treat this as an error or as delta. the execution phase will decide. the vision doesn't require this case to work.

---

## re-examined: what does "replace" actually mean?

the vision says `--roles mechanic` → boots with ONLY mechanic.

**what if mechanic has no hooks?**

- hooks are what get written to `settings.enroll.$hash.json`
- if mechanic has briefs but no hooks, config file may have empty hooks
- brain boots with empty hooks → no briefs loaded via sessionstart?

**checked extant behavior**:
- roles like architect may have briefs but no SessionStart hooks
- without hooks, briefs don't load via sessionstart
- this is the same for current default behavior

**is this a problem?**

no. the vision says "role has no hooks → silent skip". a role without hooks simply doesn't add entries to the config. the brain boots, just with fewer (or no) hook-loaded briefs.

**verdict**: correct behavior. no hooks = no entries. this is expected.

---

## re-examined: BrainCliEnrollmentManifest fields

the blueprint says BrainCliEnrollmentManifest has `{ brain, roles }`.

**is this sufficient?**

- `brain` — which brain to enroll (e.g., "claude")
- `roles` — final computed roles

**what about errors?**

errors are thrown, not returned. if a role name is invalid, computeBrainCliEnrollment throws BadRequestError with suggestion.

**is throw vs return correct?**

yes. errors halt execution. there's no partial success. if a role name is invalid, the command fails. throw is correct.

**verdict**: correct. throw for errors, return BrainCliEnrollmentManifest for success.

---

## re-examined: composition flow correctness

```
invokeEnroll
  → validate --roles is present (required)
  → parseBrainCliEnrollmentSpec(spec)
  → getLinkedRoleSlugs(agentDir)
  → computeBrainCliEnrollment({ brain, spec, rolesDefault, rolesLinked })
  → genBrainCliConfigArtifact({ enrollment, repoPath })
  → enrollBrainCli({ brain, configPath, args, cwd })
```

**is this order correct?**

1. validate --roles required — yes, fail fast if absent
2. parse spec — yes, validate input syntax
3. get linked roles — yes, need defaults
4. compute enrollment — yes, combine spec with defaults
5. gen config — yes, need final roles to write config
6. enroll brain — yes, spawn with config

**any absent step?**

- check .agent/ exists — should happen before getLinkedRoleSlugs
- getLinkedRoleSlugs may throw if .agent/ not found

**checked usecase.11**: "no .agent/ found, run rhx init first"

the blueprint says "invokeEnroll checks agentDir exists". this can be in getLinkedRoleSlugs or invokeEnroll.

**verdict**: acceptable. the check can be in either place. the criteria just requires the error message.

---

## re-examined: spawn mechanism

**blueprint says**: `enrollBrainCli` spawns with `--bare --settings <path>`

**vision says**: enrolled brain boots with ONLY the specified roles' hooks

**is the spawn mechanism correct?**

- `--bare` — skips auto-discovery of hooks, skills, MCP, CLAUDE.md
- `--settings <path>` — loads settings from the specified file only

this combination ensures:
- global `~/.claude/settings.json` — NOT loaded (--bare)
- repo `.claude/settings.json` — NOT loaded (--bare)
- custom `settings.enroll.$hash.json` — loaded (--settings)

**verdict**: correct. the spawn mechanism adheres to the vision's hard requirement.

---

## summary of r7 + r8 findings

| check | r7 status | r8 status |
|-------|-----------|-----------|
| syntax detection | ✓ holds | ✓ holds |
| replace mode | ✓ correct | ✓ correct |
| delta mode | ✓ correct | ✓ correct |
| error cases | ✓ correct | ✓ correct (throw) |
| BrainCliEnrollmentManifest | — | ✓ correct shape |
| composition flow | — | ✓ correct order |
| spawn mechanism | — | ✓ `--bare --settings` correct |
| edge cases | — | ✓ mixed bare+prefix is undefined |

---

## verdict

- [x] re-examined mode detection edge cases — undefined behavior is acceptable
- [x] re-examined replace semantics — no hooks = no entries, correct
- [x] re-examined BrainCliEnrollmentManifest fields — errors thrown, not returned
- [x] re-examined composition flow — order is correct
- [x] re-examined spawn mechanism — `--bare --settings` adheres to vision
- [x] no misinterpretations found

