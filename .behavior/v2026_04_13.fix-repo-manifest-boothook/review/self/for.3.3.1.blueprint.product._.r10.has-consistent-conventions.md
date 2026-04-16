# self-review: has-consistent-conventions (round 10)

## question

does the blueprint follow extant name conventions?

## methodology

1. search for all `find*` and `assert*` patterns in src/
2. extract the structure of each
3. compare blueprint names to extant structures
4. flag deviations and fix or justify

---

## extant pattern search

searched for `export const (find|assert)` in src/:

### find* patterns found

```
findDefaultSshKey                    → find[Target]
findBrainAtomByRef                   → find[Target]By[Lookup]
findBrainReplByRef                   → find[Target]By[Lookup]
findUniqueSkillExecutable            → find[Uniqueness][Target]
findUniqueInitExecutable             → find[Uniqueness][Target]
findUniqueRoleDir                    → find[Uniqueness][Target]
findNonExecutableShellSkills         → find[Condition][Target]
findActorBrainInAllowlist            → find[Target]In[Scope]
findActorRoleSkillBySlug             → find[Target]By[Lookup]
```

### assert* patterns found

```
assertDepAgeIsInstalled              → assert[Subject]Is[State]
assertZeroOrphanMinifiedBriefs       → assert[Condition]
assertRegistrySkillsExecutable       → assert[Scope][Subject][Predicate]
assertKeyrackOrgMatchesManifest      → assert[Subject][Predicate]
assertKeyrackEnvIsSpecified          → assert[Subject]Is[State]
assertKeyGradeProtected              → assert[Subject][Predicate]
```

---

## blueprint names examined

### 1. findRolesWithBootableButNoHook

**structure:** `find[Target]With[Condition]`

**extant comparison:**

closest matches:
- `findNonExecutableShellSkills` = `find[Condition][Target]`
- `findActorBrainInAllowlist` = `find[Target]In[Scope]`

blueprint uses `With` to connect target to condition.

**why this holds:**

the condition is compound:
- role HAS bootable content (briefs.dirs OR skills.dirs)
- AND role lacks boot hook

tried to fit `find[Condition][Target]` pattern:
- `findBootableNoHookRoles` — hard to parse compound condition
- `findBootableRolesWithoutHook` — "bootable" is ambiguous (is role bootable, or has bootable content?)
- `findRolesWithoutBootHook` — loses the "has bootable content" part of condition

the `With` preposition makes the compound condition readable:
- `findRolesWithBootableButNoHook` = find roles (with bootable content but no hook)

this is similar to how `In` separates target from scope in `findActorBrainInAllowlist`.

**verdict:** holds — compound condition justifies structural divergence

### 2. assertRegistryBootHooksDeclared

**original:** `assertRegistryBootHooks`
**fixed to:** `assertRegistryBootHooksDeclared`

**issue found:**

extant pattern `assertRegistrySkillsExecutable` follows `assert[Scope][Subject][Predicate]`:
- scope: `Registry`
- subject: `Skills`
- predicate: `Executable` (skills ARE executable)

original blueprint name `assertRegistryBootHooks` omitted the predicate:
- scope: `Registry`
- subject: `BootHooks`
- predicate: ???

without predicate, the name is unclear: assert boot hooks... exist? are valid? are present?

**how it was fixed:**

renamed to `assertRegistryBootHooksDeclared`:
- scope: `Registry`
- subject: `BootHooks`
- predicate: `Declared` (boot hooks ARE declared)

updated in blueprint:
- filediff tree: `assertRegistryBootHooksDeclared.ts`
- codepath tree: `assertRegistryBootHooksDeclared`
- test coverage: `assertRegistryBootHooksDeclared`
- test tree: `assertRegistryBootHooksDeclared.ts`
- insertion point: `assertRegistryBootHooksDeclared({ registry })`

**verdict:** fixed — predicate added for clarity

### 3. RoleBootHookViolation

**structure:** `[Domain][Noun]`

**extant comparison:**

no extant violation type in codebase (extant uses `string[]` for violations).

the name follows domain object convention:
- domain: `Role`
- noun: `BootHookViolation`

**why this holds:**

inline type (not exported domain object) for return shape. name is descriptive and follows compound noun pattern used elsewhere (e.g., `DeclaredStripeCustomer`, `KeyrackKeyRecipient`).

**verdict:** holds — follows domain noun convention

### 4. hasBootableContent

**structure:** `has[Noun]`

**extant comparison:**

`has*` prefix is standard for booleans throughout codebase.

**why this holds:**

`hasBootableContent` reads as: "does this role have bootable content?"

answers with boolean. standard pattern.

**verdict:** holds — follows boolean convention

### 5. hasBriefsDirs

**structure:** `has[Noun]`

**why this holds:**

same as above. `hasBriefsDirs` answers: "does role have briefs.dirs declared?"

**verdict:** holds — follows boolean convention

### 6. hasSkillsDirs

**structure:** `has[Noun]`

**why this holds:**

same as above. `hasSkillsDirs` answers: "does role have skills.dirs declared?"

**verdict:** holds — follows boolean convention

---

## file name verification

all file names match function names (per `rule.require.sync-filename-opname`):

| function | file |
|----------|------|
| `findRolesWithBootableButNoHook` | `findRolesWithBootableButNoHook.ts` |
| `assertRegistryBootHooksDeclared` | `assertRegistryBootHooksDeclared.ts` |

test files collocated:

| function | test file |
|----------|-----------|
| `findRolesWithBootableButNoHook` | `findRolesWithBootableButNoHook.test.ts` |
| `assertRegistryBootHooksDeclared` | `assertRegistryBootHooksDeclared.test.ts` |

**verdict:** holds — follows file name conventions

---

## summary

| name | result | notes |
|------|--------|-------|
| `findRolesWithBootableButNoHook` | holds | compound condition justifies `With` |
| `assertRegistryBootHooksDeclared` | fixed | added `Declared` predicate |
| `RoleBootHookViolation` | holds | follows domain noun pattern |
| `hasBootableContent` | holds | follows boolean pattern |
| `hasBriefsDirs` | holds | follows boolean pattern |
| `hasSkillsDirs` | holds | follows boolean pattern |

**issue found and fixed:**

`assertRegistryBootHooks` was renamed to `assertRegistryBootHooksDeclared` to match the extant `assert[Scope][Subject][Predicate]` pattern from `assertRegistrySkillsExecutable`.

the fix was applied to the blueprint in 6 locations.

**verdict:** **pass** — all names now follow conventions

