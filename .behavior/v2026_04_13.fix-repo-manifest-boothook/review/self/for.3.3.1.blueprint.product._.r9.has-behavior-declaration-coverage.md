# self-review: has-behavior-declaration-coverage (round 9)

## question

does the blueprint cover all requirements from the vision and criteria?

## methodology

1. extract all requirements from wish, vision, and criteria
2. trace each requirement to blueprint coverage
3. flag gaps and fix them

---

## wish requirements

source: `.behavior/v2026_04_13.fix-repo-manifest-boothook/0.wish.md`

| requirement | blueprint coverage |
|-------------|-------------------|
| failfast guard for roles with bootable content but no hook | `assertRegistryBootHooksDeclared` throws BadRequestError |
| prevent `rhachet.repo.yml` from creation | assertion runs before manifest generation |
| explicit onBoot hook required | checks `hooks?.onBrain?.onBoot.length > 0` |
| error teaches the pattern | turtle vibes treestruct with "hint:" and "why:" sections |

**verdict:** all wish requirements covered

---

## vision requirements

the vision prescribes the error format as turtle vibes treestruct:

```
🐢 bummer dude...

🔐 repo introspect
   └─ ✗ roles with bootable content but no boot hook
   ...
```

| requirement | blueprint coverage |
|-------------|-------------------|
| turtle emoji header | error message format in blueprint |
| treestruct format | error message format in blueprint |
| lists affected roles | violation includes roleSlug |
| shows what role has | violation includes hasBriefsDirs, hasSkillsDirs |
| shows hint | error format includes "hint:" line |
| explains why | error format includes "why:" explanation |

**verdict:** all vision requirements covered

---

## criteria requirements

extracted from prior test coverage reviews (r7):

### usecase.1 = valid registry

```
given(all roles have valid onBoot hooks)
  when(repo introspect)
    then(succeeds)
    then(manifest created)
```

| requirement | blueprint coverage |
|-------------|-------------------|
| introspect succeeds | findRolesWithBootableButNoHook returns empty |
| manifest created | assertion passes, proceeds to generate |

**test coverage:**
- findRolesWithBootableButNoHook case1: all valid → empty array
- assertRegistryBootHooksDeclared case1: all valid → no throw
- acceptance case1: valid registry → success

### usecase.2 = role with bootable content but no hook

```
given(role has briefs.dirs but no onBoot)
  when(repo introspect)
    then(exit != 0)
    then(error contains role slug)
    then(error contains hint)
```

| requirement | blueprint coverage |
|-------------|-------------------|
| exit != 0 | BadRequestError thrown |
| error contains slug | violation.roleSlug in message |
| error contains hint | "hint:" line in error format |

**test coverage:**
- findRolesWithBootableButNoHook case2: briefs.dirs, no hook → violation
- findRolesWithBootableButNoHook case3: skills.dirs, no hook → violation
- findRolesWithBootableButNoHook case4: both dirs, no hook → violation
- assertRegistryBootHooksDeclared case2: throws BadRequestError
- assertRegistryBootHooksDeclared case3: message contains slug
- assertRegistryBootHooksDeclared case4: message contains hint
- acceptance case2, case3, case4: failure scenarios

### usecase.3 = typed skills only role

```
given(role has typed skills but no briefs.dirs or skills.dirs)
  when(repo introspect)
    then(succeeds)
```

| requirement | blueprint coverage |
|-------------|-------------------|
| introspect succeeds | role not flagged (no bootable content) |

**test coverage:**
- findRolesWithBootableButNoHook case5: typed skills only → empty
- acceptance case5: typed-skills-only → success

### usecase.5 = multiple invalid roles

```
given(multiple roles lack onBoot)
  when(repo introspect)
    then(error lists all)
```

| requirement | blueprint coverage |
|-------------|-------------------|
| error lists all | findRolesWithBootableButNoHook returns all violations |

**test coverage:**
- findRolesWithBootableButNoHook case10: multiple invalid → all returned
- assertRegistryBootHooksDeclared case5: error lists all

### usecase.6 = role with inits only

```
given(role has inits.exec but no dirs)
  when(repo introspect)
    then(succeeds)
```

| requirement | blueprint coverage |
|-------------|-------------------|
| introspect succeeds | role not flagged (no bootable content) |

**test coverage:**
- findRolesWithBootableButNoHook case6: inits only → empty

### usecase.7 = empty registry

```
given(empty registry with no roles)
  when(repo introspect)
    then(succeeds)
```

| requirement | blueprint coverage |
|-------------|-------------------|
| introspect succeeds | empty violations for empty registry |

**test coverage:**
- findRolesWithBootableButNoHook case11: empty registry → empty
- assertRegistryBootHooksDeclared case6: empty registry → no throw

---

## boundary conditions

from prior reviews, the criteria specified:

| boundary | blueprint coverage |
|----------|-------------------|
| property presence, not content | `role.briefs?.dirs !== undefined` |
| empty array counts as declared | presence check, not length check |
| empty onBoot array = no hook | `hooks?.onBrain?.onBoot.length > 0` |

**test coverage:**
- findRolesWithBootableButNoHook case7: empty onBoot array → violation
- findRolesWithBootableButNoHook case8: undefined hooks → violation
- findRolesWithBootableButNoHook case9: empty briefs.dirs array → violation

---

## summary

| source | requirements | covered |
|--------|--------------|---------|
| wish | 4 | 4 (100%) |
| vision | 6 | 6 (100%) |
| criteria usecases | 6 | 6 (100%) |
| criteria boundaries | 3 | 3 (100%) |

all requirements traced to blueprint coverage.

**verdict:** **pass** — complete coverage of behavior declaration

