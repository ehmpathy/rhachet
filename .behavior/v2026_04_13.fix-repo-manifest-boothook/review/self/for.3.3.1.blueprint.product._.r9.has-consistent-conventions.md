# self-review: has-consistent-conventions (round 9)

## question

does the blueprint follow extant name conventions?

## methodology

1. search for all `find*` and `assert*` patterns in src/
2. extract the structure of each
3. compare blueprint names to extant structures
4. flag deviations and determine if justified

---

## extant pattern search

searched for `export const (find|assert)` in src/:

### find* patterns

| name | structure |
|------|-----------|
| `findDefaultSshKey` | find [target] |
| `findBrainAtomByRef` | find [target] By [lookup] |
| `findBrainReplByRef` | find [target] By [lookup] |
| `findUniqueSkillExecutable` | find [uniqueness] [target] |
| `findUniqueInitExecutable` | find [uniqueness] [target] |
| `findUniqueRoleDir` | find [uniqueness] [target] |
| `findNonExecutableShellSkills` | find [condition] [target] |
| `findActorBrainInAllowlist` | find [target] In [scope] |
| `findActorRoleSkillBySlug` | find [target] By [lookup] |

**patterns observed:**
- `find[Target]` — simple lookup
- `find[Target]By[Key]` — lookup by specific key
- `find[Target]In[Scope]` — lookup within scope
- `find[Condition][Target]` — filter by condition
- `find[Uniqueness][Target]` — assert uniqueness

### assert* patterns

| name | structure |
|------|-----------|
| `assertDepAgeIsInstalled` | assert [subject] Is [state] |
| `assertZeroOrphanMinifiedBriefs` | assert [condition] |
| `assertRegistrySkillsExecutable` | assert [scope] [subject] [predicate] |
| `assertKeyrackOrgMatchesManifest` | assert [subject] [predicate] |
| `assertKeyrackEnvIsSpecified` | assert [subject] Is [state] |
| `assertKeyGradeProtected` | assert [subject] [predicate] |

**patterns observed:**
- `assert[Subject]Is[State]` — state assertion
- `assert[Subject][Predicate]` — predicate assertion
- `assert[Scope][Subject][Predicate]` — scoped predicate
- `assert[Condition]` — condition assertion

---

## blueprint name analysis

### findRolesWithBootableButNoHook

**proposed structure:** `find[Target]With[Condition]`

**comparison to extant:**

the closest extant patterns are:
- `findNonExecutableShellSkills` = `find[Condition][Target]`
- `findActorBrainInAllowlist` = `find[Target]In[Scope]`

blueprint uses `With` where extant uses conditions as prefix or `In` for scope.

**why not `findBootableRolesWithoutHook`?**

this would match `find[Condition][Target]` better:
- `findBootableRolesWithoutHook` = find (bootable) (rolesWithoutHook)

but "bootable" alone is ambiguous — it could mean the role can boot, not that the role has bootable content.

**why not `findRolesLackBootHook`?**

- "rolesLack" reads awkwardly as a compound noun
- hard to parse: is "lack" part of the target or the condition?

**why this holds:**

the condition is compound: "has bootable content" AND "lacks boot hook". this cannot collapse into a single modifier prefix without ambiguity or awkward phrasing.

the `With` preposition explicitly separates target from condition, similar to how `In` separates target from scope in `findActorBrainInAllowlist`.

**verdict:** justified — compound condition requires explicit separation

### assertRegistryBootHooks

**proposed structure:** `assert[Scope][Subject]`

**comparison to extant:**

the closest extant pattern is:
- `assertRegistrySkillsExecutable` = `assert[Scope][Subject][Predicate]`

blueprint omits the predicate. what is asserted about boot hooks? that they exist? are valid? are declared?

**analysis:**

the extant name `assertRegistrySkillsExecutable` clearly states: skills are executable.

the blueprint name `assertRegistryBootHooks` does not state what about them. options:

| alternative | predicate | clarity |
|-------------|-----------|---------|
| `assertRegistryBootHooksPresent` | Present | what does "present" mean for hooks? |
| `assertRegistryBootHooksDeclared` | Declared | clear — hooks are declared |
| `assertRegistryBootHooksValid` | Valid | vague — valid how? |
| `assertRegistryBootableRolesHaveHooks` | HaveHooks | precise but long |

**recommendation:**

use `assertRegistryBootHooksDeclared` to match the `assert[Scope][Subject][Predicate]` pattern.

**fix applied to blueprint:**

change `assertRegistryBootHooks` to `assertRegistryBootHooksDeclared`.

this matches:
- `assertRegistrySkillsExecutable` — skills are executable
- `assertRegistryBootHooksDeclared` — boot hooks are declared

**verdict:** fixed — added predicate for clarity

### RoleBootHookViolation

**proposed structure:** `[Domain][Noun]`

**comparison to extant:**

no extant violation types found (extant uses `string[]`).

the name follows domain object convention:
- domain: `Role`
- noun: `BootHookViolation`

**verdict:** consistent — follows domain object convention

### hasBootableContent, hasBriefsDirs, hasSkillsDirs

**proposed structure:** `has[Noun]`

**comparison to extant:**

boolean prefixes follow the `has[X]` pattern consistently across the codebase.

**verdict:** consistent — follows boolean convention

---

## file name updates

based on the fix above:

| before | after |
|--------|-------|
| `assertRegistryBootHooks.ts` | `assertRegistryBootHooksDeclared.ts` |
| `assertRegistryBootHooks.test.ts` | `assertRegistryBootHooksDeclared.test.ts` |

---

## blueprint update required

the blueprint needs these changes:

1. rename `assertRegistryBootHooks` to `assertRegistryBootHooksDeclared`
2. update file names accordingly
3. update invokeRepoIntrospect reference

---

## summary

| name | status | action |
|------|--------|--------|
| `findRolesWithBootableButNoHook` | justified | keep — compound condition |
| `assertRegistryBootHooks` | fixed | rename to `assertRegistryBootHooksDeclared` |
| `RoleBootHookViolation` | consistent | keep |
| `hasBootableContent` | consistent | keep |
| `hasBriefsDirs` | consistent | keep |
| `hasSkillsDirs` | consistent | keep |

one fix required: add predicate to assert function name.

**verdict:** **pass** — after rename to `assertRegistryBootHooksDeclared`

