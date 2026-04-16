# self-review: has-consistent-conventions (round 8)

## question

does the blueprint follow extant name conventions?

## methodology

1. list all names the blueprint introduces
2. compare each to extant analogous names
3. flag deviations as issues or justified

---

## name analysis

### new names introduced

| name | type | purpose |
|------|------|---------|
| `findRolesWithBootableButNoHook` | function | find violations |
| `assertRegistryBootHooks` | function | throw if violations |
| `RoleBootHookViolation` | type | violation shape |
| `hasBootableContent` | concept | briefs.dirs OR skills.dirs |
| `hasBriefsDirs` | variable | boolean check |
| `hasSkillsDirs` | variable | boolean check |

### comparison to extant names

#### findRolesWithBootableButNoHook vs findNonExecutableShellSkills

| aspect | extant | blueprint |
|--------|--------|-----------|
| prefix | `find` | `find` |
| target | `NonExecutableShellSkills` | `RolesWithBootableButNoHook` |
| structure | `find[condition][target]` | `find[target]With[condition]` |

**deviation detected:** structure differs.

extant uses `find[condition][target]`:
- `findNonExecutableShellSkills` = find (nonExecutable) (shellSkills)

blueprint uses `find[target]With[condition]`:
- `findRolesWithBootableButNoHook` = find (roles) with (bootableButNoHook)

**is this justified?**

the extant name works because the condition modifies a single noun:
- "nonExecutable shellSkills" — the skills that are not executable

the blueprint condition is compound:
- "roles that have bootable content but lack onBoot hook"
- cannot be collapsed into a single modifier

tried alternatives:
- `findUnbootedRolesWithBootableContent` — unclear what "unbooted" means
- `findBootableRolesWithoutHook` — ambiguous (bootable could mean role itself)
- `findRolesMissingBootHook` — uses gerund-adjacent "missing"

**verdict:** justified deviation — compound condition requires different structure

#### assertRegistryBootHooks vs assertRegistrySkillsExecutable

| aspect | extant | blueprint |
|--------|--------|-----------|
| prefix | `assertRegistry` | `assertRegistry` |
| target | `SkillsExecutable` | `BootHooks` |
| structure | `assertRegistry[target][predicate]` | `assertRegistry[target]` |

**deviation detected:** extant includes predicate, blueprint omits.

extant: `assertRegistrySkillsExecutable` = assert that skills are executable
blueprint: `assertRegistryBootHooks` = assert... what about boot hooks?

**is this a problem?**

the extant name clarifies what is asserted: skills ARE executable.

the blueprint name is less clear: boot hooks... exist? are valid? are declared?

tried alternatives:
- `assertRegistryBootHooksDeclared` — clear but verbose
- `assertRegistryHasBootHooks` — better, but "has" is weak
- `assertRegistryBootableRolesHaveHooks` — precise but long

**recommendation:** accept `assertRegistryBootHooks` with note that predicate is implicit. the function's jsdoc will clarify: "asserts all bootable roles have onBoot hooks declared."

**verdict:** minor deviation — predicate implicit, accepted with documentation

#### RoleBootHookViolation

| aspect | convention | blueprint |
|--------|------------|-----------|
| structure | `[Domain][Noun]` | `Role` + `BootHookViolation` |
| extant similar | none (extant uses `string[]`) | n/a |

**analysis:**

no extant violation type to compare. the name follows domain object convention:
- domain: `Role`
- noun: `BootHookViolation`

**verdict:** consistent — follows domain object convention

#### hasBootableContent, hasBriefsDirs, hasSkillsDirs

| aspect | convention | blueprint |
|--------|------------|-----------|
| prefix | `has` | `has` |
| target | noun | `BootableContent`, `BriefsDirs`, `SkillsDirs` |

**analysis:**

these are boolean variables, not functions. the `has` prefix is standard for booleans.

extant patterns in codebase:
- `hasChanges`
- `hasErrors`
- `hasDirs` (not found, but `has[X]` pattern exists)

**verdict:** consistent — follows boolean convention

---

## file name analysis

### new files introduced

| file | convention check |
|------|------------------|
| `findRolesWithBootableButNoHook.ts` | matches function name |
| `findRolesWithBootableButNoHook.test.ts` | collocated test |
| `assertRegistryBootHooks.ts` | matches function name |
| `assertRegistryBootHooks.test.ts` | collocated test |

**verdict:** consistent — follows file name conventions

---

## conclusion

| name | consistent? | notes |
|------|-------------|-------|
| `findRolesWithBootableButNoHook` | justified deviation | compound condition requires different structure |
| `assertRegistryBootHooks` | minor deviation | predicate implicit, accepted with docs |
| `RoleBootHookViolation` | yes | follows domain object convention |
| `hasBootableContent` | yes | follows boolean convention |
| `hasBriefsDirs` | yes | follows boolean convention |
| `hasSkillsDirs` | yes | follows boolean convention |
| file names | yes | follows convention |

all names are either consistent or justified deviations.

**verdict:** **pass** — conventions are followed

