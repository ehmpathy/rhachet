# self-review: has-questioned-deletables (round 3)

## question

can any features or components be deleted? what is the simplest version that works?

## feature-by-feature deletion attempt

### feature: findRolesWithBootableButNoHook.ts (separate file)

**can this be removed?** yes, logic could live directly in assertRegistryBootHooks

**if deleted and added back, would we?**
- yes, for unit tests: find logic has 8 test cases, easier to test in isolation
- yes, for pattern consistency: extant assertRegistrySkillsExecutable uses same separation

**simplest version that still works:**
- inline would work functionally
- but would make unit tests harder to write
- and break extant pattern

**verdict:** keep — deletion would complicate tests

### feature: RoleBootHookViolation type

**can this be removed?** yes, could return string[] of slugs

**if deleted and added back, would we?**
- vision says: "error shows which dirs are declared"
- need to know per role: briefs.dirs? skills.dirs? both?
- string[] loses this info

**simplest version that still works:**
- string[] does NOT work (violates vision requirement)
- structured type is minimum needed

**verdict:** keep — required for vision

### feature: "why:" explanation in error

**can this be removed?**

**wait — does the vision actually require this?**

re-read vision... "the guard teaches the pattern while it prevents the footgun"

the example error in vision includes:
```
   why:
   roles with briefs.dirs or skills.dirs have content to boot on session start.
   without hooks.onBrain.onBoot, the content is linked but never loaded.
```

**verdict:** keep — vision explicitly shows this in error example

### feature: test fixture with-roles-package-no-hook

**can this be removed?**

**what if we used mocks instead?**
- acceptance tests are blackbox — no mocks allowed
- need real package that exports getRoleRegistry

**what if we modified extant fixture?**
- extant fixture has onBoot hook
- if modified, breaks other tests that expect valid registry

**verdict:** keep — no alternative for blackbox tests

### feature: 8 unit test cases for find

**can any cases be removed?**

| case | can delete? | why |
|------|-------------|-----|
| case1: all valid | no | positive case needed |
| case2: briefs only | no | criteria matrix row |
| case3: skills only | no | criteria matrix row |
| case4: both dirs | no | criteria matrix row |
| case5: typed only | no | criteria usecase.3 |
| case6: empty array | no | criteria boundary |
| case7: undefined hooks | no | criteria boundary |
| case8: multiple roles | no | criteria usecase.5 "lists ALL" |

**verdict:** keep all — each maps to criteria

## conclusion

attempted deletion of each feature:
1. separate find file — keeps tests simple, follows pattern
2. violation type — required by vision "shows which dirs"
3. "why:" explanation — shown in vision example
4. test fixture — required for blackbox tests
5. test cases — each maps to criteria

**no deletions possible without a violation of vision or criteria.**

## what would the simplest version look like?

the blueprint IS the simplest version:
- one find function (returns violations)
- one assert function (throws if violations)
- one error format (from vision example)
- tests that map 1:1 to criteria

any simpler version would violate requirements.

## verdict

**pass** — all components are minimal and required.
