# self-review: has-consistent-mechanisms (round 8)

## question

does the blueprint duplicate extant functionality or deviate from extant patterns?

## methodology

this round digs deeper:
1. search for all related codepaths (beyond assertRegistry pattern)
2. examine domain object structure
3. verify no hidden duplication
4. confirm all deviations are justified

---

## deeper search: hooks-related code

searched for `onBoot|onBrain` in src/:

found 16 files. the most relevant:
- `getLinkedRolesWithHooks.ts` — discovers linked roles and filters by hooks
- `RoleHooksOnBrain.ts` — domain object with `onBoot?: RoleHookOnBrain[]`
- `RoleHooks.ts` — container with `onBrain?: RoleHooksOnBrain`

### getLinkedRolesWithHooks analysis

```ts
// only include roles that have hooks.onBrain declared
if (role.hooks?.onBrain) {
  roles.push({ ...role, repo: registry.slug });
}
```

this checks `hooks?.onBrain` existence, not `hooks?.onBrain?.onBoot`.

**is this a duplication concern?**

| purpose | getLinkedRolesWithHooks | blueprint find |
|---------|------------------------|----------------|
| what | filters roles with ANY brain hooks | finds roles that need boot hooks |
| condition | `hooks?.onBrain` exists | bootable content but no `onBoot` |
| when | at runtime, for hook application | at build time, for validation |
| output | roles to apply hooks to | violations to report |

these are fundamentally different operations. no duplication.

### RoleHooksOnBrain structure

```ts
interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
  onTalk?: RoleHookOnBrain[];
}
```

the blueprint check is `hooks?.onBrain?.onBoot.length > 0`.

**why check length?**

per criteria boundary: empty `onBoot: []` is "not valid declaration". the array must have at least one hook.

this is consistent with how arrays are checked elsewhere — presence check includes content check.

---

## assertRegistry pattern deep dive

### file structure comparison

| aspect | extant (skills) | blueprint (boot hooks) |
|--------|----------------|------------------------|
| find file | findNonExecutableShellSkills.ts | findRolesWithBootableButNoHook.ts |
| assert file | assertRegistrySkillsExecutable.ts | assertRegistryBootHooks.ts |
| test files | *.test.ts collocated | *.test.ts collocated |
| location | domain.operations/manifest/ | domain.operations/manifest/ |

**why this holds:** identical file structure pattern.

### function signature comparison

| aspect | extant | blueprint |
|--------|--------|-----------|
| find input | `{ registry: RoleRegistry }` | `{ registry: RoleRegistry }` |
| find output | `string[]` | `RoleBootHookViolation[]` |
| assert input | `{ registry: RoleRegistry }` | `{ registry: RoleRegistry }` |
| assert output | void (throws) | void (throws) |
| error type | BadRequestError | BadRequestError |

**why output differs:**

extant returns file paths (strings). blueprint returns typed violations.

the error message needs structured data:
```
├─ acme/designer
│  ├─ has: briefs.dirs, skills.dirs
```

`hasBriefsDirs` and `hasSkillsDirs` booleans are required to render "has:" line.

**why this is not a pattern break:**

the pattern is "find returns array of violations". the violation type varies by what the find detects:
- skills executable → violation is the non-executable path
- boot hooks → violation is { roleSlug, hasBriefsDirs, hasSkillsDirs }

the generic pattern holds; the concrete type is domain-specific.

---

## utility function search

### extractDirUris

extant in findNonExecutableShellSkills.ts:
```ts
const extractDirUris = (
  dirs: { uri: string } | { uri: string }[],
): string[] => {
  if (Array.isArray(dirs)) return dirs.map((d) => d.uri);
  return [dirs.uri];
};
```

**should blueprint reuse this?**

blueprint needs:
```ts
const hasBriefsDirs = role.briefs?.dirs !== undefined;
```

this checks PRESENCE of property, not CONTENT.

per criteria boundary: "declaration of dirs, not contents, is the signal"

extractDirUris extracts uris from declared dirs. blueprint checks if dirs is declared at all. different operations — cannot reuse.

### isExecutable

extant helper:
```ts
const isExecutable = (filePath: string): boolean => {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};
```

**should blueprint use this?**

no — blueprint doesn't check file executability. it checks role config structure. no relation.

---

## other potential duplications

### hasBootableContent

searched for `hasBootableContent|bootable` in src/: no files found.

this concept does not exist in the codebase. the blueprint introduces it.

**is this justified?**

the vision introduces the concept of "bootable content" = briefs.dirs OR skills.dirs. this is new domain language for this feature. no duplication.

### hooks presence check

searched for patterns like `hooks?.onBrain?.onBoot`.

in getLinkedRolesWithHooks: `if (role.hooks?.onBrain)`

this checks onBrain existence, not onBoot specifically. different condition.

**why this holds:** no extant check for onBoot specifically. the blueprint introduces this validation.

---

## conclusion

| potential duplication | investigation | result |
|----------------------|---------------|--------|
| getLinkedRolesWithHooks | checks any hooks, not onBoot | not duplicated |
| extractDirUris | extracts content, not checks presence | cannot reuse |
| isExecutable | checks file perms, not config | not related |
| hasBootableContent | does not exist | new concept, justified |
| onBoot presence | no extant check | new validation |

all mechanisms in the blueprint are either:
1. new (hasBootableContent, onBoot presence check)
2. consistent with extant pattern (find + assert)
3. justified deviations (typed violations for error format)

**verdict:** **pass** — no duplications found, patterns are consistent, deviations justified

