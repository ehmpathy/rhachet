# self-review: has-consistent-mechanisms (round 7)

## question

does the blueprint duplicate extant functionality or deviate from extant patterns?

## methodology

1. search for related codepaths in codebase
2. identify the extant pattern
3. compare blueprint to extant pattern
4. flag any deviations as issues or justified differences

---

## extant pattern search

searched for `assertRegistry` in src/:

```
src/domain.operations/manifest/assertRegistrySkillsExecutable.ts
src/domain.operations/manifest/assertRegistrySkillsExecutable.test.ts
src/domain.operations/manifest/findNonExecutableShellSkills.ts
```

this is the directly analogous pattern: find + assert for registry validation.

---

## extant pattern analysis

### findNonExecutableShellSkills

```ts
export const findNonExecutableShellSkills = (input: {
  registry: RoleRegistry;
}): string[] => {
  // iterate roles
  // check skills.dirs
  // return paths of non-executable .sh files
};
```

**pattern:**
- input: `{ registry: RoleRegistry }`
- output: array of violations (strings in this case)
- pure computation, no side effects

### assertRegistrySkillsExecutable

```ts
export const assertRegistrySkillsExecutable = (input: {
  registry: RoleRegistry;
}): void => {
  const nonExecutablePaths = findNonExecutableShellSkills({ registry });
  if (nonExecutablePaths.length === 0) return;

  // build error message
  throw new BadRequestError(message, { nonExecutablePaths });
};
```

**pattern:**
- input: `{ registry: RoleRegistry }`
- output: void (throws if violations)
- calls find function
- early return if no violations
- builds error message
- throws BadRequestError with metadata

---

## blueprint pattern comparison

### findRolesWithBootableButNoHook

blueprint declares:
```
input: { registry: RoleRegistry }
output: RoleBootHookViolation[]
```

**comparison:**

| aspect | extant | blueprint | consistent? |
|--------|--------|-----------|-------------|
| input | `{ registry }` | `{ registry }` | yes |
| output type | `string[]` | `RoleBootHookViolation[]` | see analysis |
| location | `domain.operations/manifest/` | `domain.operations/manifest/` | yes |
| purity | pure | pure | yes |

**output type difference:**

extant returns `string[]` (file paths). blueprint returns `RoleBootHookViolation[]`:

```ts
interface RoleBootHookViolation {
  roleSlug: string;
  hasBriefsDirs: boolean;
  hasSkillsDirs: boolean;
}
```

**is this justified?**

the error message needs to show:
```
├─ acme/designer
│  ├─ has: briefs.dirs, skills.dirs
│  └─ hint: add hooks.onBrain.onBoot...
```

this requires:
- the role slug (which dirs it has)
- which dirs are declared (briefs.dirs, skills.dirs, or both)

a simple `string[]` cannot carry this information. the typed object is necessary for the error format.

**verdict:** justified deviation — error format requires structured data

### assertRegistryBootHooks

blueprint declares:
```
input: { registry: RoleRegistry }
output: void (throws BadRequestError if violations)

├── [+] call findRolesWithBootableButNoHook({ registry })
├── [+] if violations.length === 0, return early
├── [+] build error message
└── [+] throw BadRequestError(message, { violations })
```

**comparison:**

| aspect | extant | blueprint | consistent? |
|--------|--------|-----------|-------------|
| input | `{ registry }` | `{ registry }` | yes |
| output | void, throws | void, throws | yes |
| error type | BadRequestError | BadRequestError | yes |
| pattern | call find, check, throw | call find, check, throw | yes |
| location | `domain.operations/manifest/` | `domain.operations/manifest/` | yes |

**error message format difference:**

extant uses:
```
'non-executable skill files detected',
'',
'these .sh files...',
pathList,
'',
'fix: run `chmod +x`...',
```

blueprint vision shows turtle vibes treestruct:
```
🐢 bummer dude...

🔐 repo introspect
   └─ ✗ roles with bootable content but no boot hook
...
```

**is this justified?**

the vision explicitly prescribes the turtle vibes treestruct format for this error. this is not a deviation from extant pattern — it follows vision requirements.

**verdict:** justified — vision prescribes the error format

---

## helper function analysis

### extractDirUris

extant `findNonExecutableShellSkills` has:
```ts
const extractDirUris = (
  dirs: { uri: string } | { uri: string }[],
): string[] => {
  if (Array.isArray(dirs)) return dirs.map((d) => d.uri);
  return [dirs.uri];
};
```

**does blueprint reuse this?**

the blueprint uses property presence check:
```ts
const hasBriefsDirs = role.briefs?.dirs !== undefined;
const hasSkillsDirs = role.skills?.dirs !== undefined;
```

this is NOT extractDirUris. should we reuse it?

**analysis:**

extractDirUris extracts the uri strings from a dirs config. it's used to get actual paths to enumerate files.

the blueprint needs to check if dirs property is declared, not extract contents. per criteria boundary condition: "declaration of dirs, not contents, is the signal".

these are fundamentally different operations:
- extractDirUris: get paths from config
- blueprint: check if config property exists

**verdict:** not a duplication — different purpose. cannot reuse.

---

## conclusion

| mechanism | consistent with extant? | notes |
|-----------|-------------------------|-------|
| find function | yes | same input/output pattern |
| assert function | yes | same call/check/throw pattern |
| violation type | justified deviation | structured data for error format |
| error format | justified deviation | vision prescribes turtle vibes |
| extractDirUris | not applicable | different purpose |
| file location | yes | same directory |
| error class | yes | BadRequestError |

the blueprint follows the extant find + assert pattern. deviations are justified by:
1. error format needs structured violation data
2. vision prescribes turtle vibes treestruct

**verdict:** **pass** — blueprint is consistent with extant mechanisms

