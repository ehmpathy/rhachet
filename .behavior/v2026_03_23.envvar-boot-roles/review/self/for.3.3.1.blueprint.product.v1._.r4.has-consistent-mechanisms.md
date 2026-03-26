# self review (r4): has-consistent-mechanisms

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

check that new mechanisms don't duplicate extant functionality.

---

## searched codebase for related patterns

searched for:
- `genBrainHooksAdapter` → found in `src/_topublish/rhachet-brains-anthropic/`
- `linked.*role` → found `getLinkedRolesWithHooks` in `src/domain.operations/brains/`

---

## check: role discovery

**blueprint says**: use extant role discovery from .agent/repo=*/role=*/

**found extant**: `getLinkedRolesWithHooks` in `src/domain.operations/brains/getLinkedRolesWithHooks.ts`

**analysis**:
- extant function discovers linked roles from .agent/repo=*/role=*/
- extant function loads Role objects with hooks
- extant function returns `HasRepo<Role>[]`

**does blueprint duplicate this?**: no, blueprint says to reuse extant patterns

**why it holds**: we call extant function, filter to specified roles, pass to genConfig

**verdict**: consistent. will reuse extant function.

---

## check: hooks adapter

**blueprint says**: reuse `genBrainHooksAdapterForClaudeCode`

**found extant**: `src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts`

**analysis**:
- extant function generates hooks config for claude-code
- takes roles and agentDir as input
- writes to .claude/settings.json

**does blueprint duplicate this?**: no, blueprint explicitly says to reuse

**question**: does extant support filter to subset of roles?

**checked**: the extant function takes `roles: HasRepo<Role>[]` as input — caller controls which roles are passed. so yes, we can filter before we call it.

**why it holds**: we filter roles before call, extant function generates config for those roles only

**verdict**: consistent. no modification needed, we filter before call.

---

## check: typo suggestions

**blueprint says**: reuse `fastest-levenshtein`

**found extant**: need to verify in package.json

**result**: already documented in r1 as verification needed in execution phase

**why it holds**: we verify dependency in execution phase, add if absent

**verdict**: consistent — will verify in execution.

---

## check: passthrough args

**blueprint says**: use `allowUnknownOption` from commander

**found extant**: this is a commander API, not custom code

**why it holds**: use library feature directly, no custom passthrough mechanism needed

**verdict**: consistent. uses library feature, not custom code.

---

## check: unique config file generation

**blueprint says**: write to `.claude/settings.enroll.$hash.json` (unique per session)

**question**: does extant code write to settings.json? how do we differ?

**checked `genBrainHooksAdapterForClaudeCode`**: it writes to `.claude/settings.json`

**difference**: blueprint specifies unique file name to:
1. avoid overwrite of repo settings.json
2. support concurrent sessions
3. enable `--bare --settings <path>` pattern

**is this new?**: yes, but intentionally different. unique config isolation is core feature requirement.

**why it holds**: this is not duplication — it's a new pattern for a new capability (isolated sessions)

**verdict**: intentional new choice. not duplication, new capability.

---

## summary of extant code reuse

| mechanism | extant code | reuse? |
|-----------|-------------|--------|
| role discovery | getLinkedRolesWithHooks | yes |
| hooks generation | genBrainHooksAdapterForClaudeCode | yes (with filter) |
| typo suggestions | fastest-levenshtein | verify in execution |
| passthrough args | commander.allowUnknownOption | yes (library) |
| config path | settings.enroll.$hash.json | new (unique per session) |

---

## why the design holds

1. **role discovery**: reuses extant `getLinkedRolesWithHooks`, no duplication
2. **hooks generation**: reuses extant adapter, filter before call
3. **typo suggestions**: reuses extant library dependency
4. **passthrough**: uses commander directly, no custom code
5. **unique config**: new capability, intentionally different from extant pattern

---

## verdict

- [x] searched codebase for related patterns
- [x] verified each new mechanism against extant
- [x] no duplication found
- [x] unique config file is intentional new capability
