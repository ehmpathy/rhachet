# review.self: has-pruned-yagni

## question: did we add extras not requested?

### what was requested (from wish)

1. failfast guard for `repo introspect` when roles have bootable content but no boot hook
2. explicit `onBoot` hook check to boot that role
3. make it clear (not magic) — explicit boot hook required

### what was implemented

| component | purpose | requested? |
|-----------|---------|------------|
| `findRolesWithBootableButNoHook.ts` | core logic to find violations | yes — needed for the failfast |
| `assertRegistryBootHooksDeclared.ts` | throws BadRequestError on violations | yes — the failfast itself |
| `invokeRepoIntrospect.ts` change | integration point | yes — where guard runs |
| three violation reasons | `no-hook-declared`, `absent-roles-boot-command`, `wrong-role-name` | yes — minimum to satisfy "explicit hook to boot THAT role" |
| unit tests | test coverage | yes — per rule.require.test-coverage-by-grain |
| acceptance test fixture | blackbox test | yes — per code.test.accept.blackbox.md |

### yagni review

**three violation reasons — needed or extra?**

the wish said "check that theres an explicit `onBoot` hook to boot that role"

this requires checks for:
1. hook presence → `no-hook-declared`
2. hook content → `absent-roles-boot-command`
3. hook correctness → `wrong-role-name`

all three are the minimum needed. a hook that boots a different role is as bad as no hook.

**treestruct error format — needed or extra?**

yes — per `rule.require.treestruct-output` brief. consistent with other repo introspect errors (skills executable, orphan briefs).

**hasBriefsDirs/hasSkillsDirs in violation — needed or extra?**

included to show WHY the role needs a boot hook. helps the user understand the constraint. minimal — two booleans.

### conclusion

no YAGNI detected. implementation is the minimum viable solution.
