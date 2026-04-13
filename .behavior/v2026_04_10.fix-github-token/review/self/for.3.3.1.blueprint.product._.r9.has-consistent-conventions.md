# self-review r9: has-consistent-conventions

## purpose

review for divergence from extant names and patterns. unless the ask was to refactor, be consistent with extant conventions.

---

## convention 1: variable name `pemPathExpanded`

**the name:**
```ts
const pemPathExpanded = pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir());
```

**does the codebase use `*Expanded` suffix?**
yes — searched for `Expanded`:

| file | variable | pattern |
|------|----------|---------|
| `setKeyrackKeyHost.ts:50` | `orgExpanded` | `@this` → actual org name |
| `execUpgrade.ts:83` | `roleExpanded` | role slug → expanded role data |

**the semantic pattern:**
- `input` = raw/compressed/symbolic form
- `inputExpanded` = literal/decompressed/substituted form

**does `pemPathExpanded` follow this semantic?**
yes:
- `pemPath` = symbolic (`~/` is a shell shorthand)
- `pemPathExpanded` = literal (`/home/user/` is the actual path)

**alternative names considered:**

| name | why rejected |
|------|-------------|
| `pemPathAbsolute` | path may not become absolute (`./foo` stays relative) |
| `pemPathFull` | vague — full of what? |
| `pathWithHome` | doesn't follow [noun][state] pattern |

**why `pemPathExpanded` is the right choice:**
1. follows extant `*Expanded` convention
2. semantically accurate: `~` is "expanded" to home dir
3. [noun][adjective] pattern: `pemPath` + `Expanded`

**verdict:** consistent. uses extant `*Expanded` suffix convention with correct semantics.

---

## convention 2: field name `mech: null`

**the name:**
uses extant field `mech` on `KeyrackKeySpec`.

**does the codebase have this field?**
yes — already defined at `KeyrackKeySpec.ts:21`:
```ts
mech: KeyrackGrantMechanism | null;
```

**does the blueprint introduce a new name?**
no — it uses the extant field name. only changes the assigned value.

**could we have used a different field?**
no — `mech` is the established term:

| type | field | semantics |
|------|-------|-----------|
| `KeyrackKeySpec` | `mech` | mechanism constraint from manifest |
| `KeyrackKeyHost` | `mech` | mechanism used for storage |
| `KeyrackKeyGrant` | `mech` | mechanism used for access |

**does the codebase use alternative terms?**
searched for `mechanism`, `type`, `storage`:
- no field named `mechanism` (would violate gerund rule)
- no field named `storageType` (would be redundant)
- `mech` is the canonical abbreviation

**why `mech: null` and not a new sentinel value?**
- `null` already means "not declared" in the type
- alternatives like `mech: 'UNSPECIFIED'` would require new enum value
- alternatives like `mech: undefined` would break the domain object (undefined forbidden)

**verdict:** consistent. uses extant field name with extant null semantics.

---

## convention 3: regex pattern for tilde expansion

**the pattern:**
```ts
/^~(?=$|\/|\\)/
```

**is there an extant pattern in the codebase?**
no — the codebase does not expand `~` to `homedir()` anywhere else.

**is the regex style consistent with codebase?**
checked regex patterns in codebase:

| file | pattern | style |
|------|---------|-------|
| `hydrateKeyrackRepoManifest.ts` | `/^[A-Z][A-Z0-9_]*$/` | anchored, character class |
| `parseKeyFromSlug.ts` | `/\.(\w+)\.(\w+)$/` | anchored, capture groups |
| `invokeKeyrack.ts` | `/^@[a-z0-9-]+$/` | anchored, character class |

**pattern analysis:**
- codebase uses `^` anchor for start
- codebase uses `$` anchor for end
- lookahead `(?=)` is not common but is valid

**why lookahead here?**
the regex must NOT match:
- `~user` (different user's home)
- `~~` (double tilde)
- `~` mid-path

the lookahead `(?=$|\/|\\)` ensures `~` is followed by end, `/`, or `\`.

alternatives:
- `pemPath.startsWith('~/')` — misses `~` alone and `~\`
- `pemPath === '~' || pemPath.startsWith('~/')` — verbose

**verdict:** consistent. regex uses anchored style. lookahead is justified for POSIX correctness.

---

## convention 4: import of `homedir`

**the original import in blueprint:**
```ts
import { homedir } from 'node:os';
```

**does the codebase use `node:` prefix?**
searched for `from 'node:` vs `from 'os'`:

| pattern | count | files |
|---------|-------|-------|
| `from 'node:os'` | 0 | (blueprint originally had this) |
| `from 'os'` | 5 | findDefaultSshKey.ts, discoverIdentities.ts, ... |

**the codebase convention:**
the codebase uses `from 'os'` (no `node:` prefix).

**issue found:**
blueprint used `node:os` but codebase convention is `os`.

**fix applied:**
updated blueprint from:
```diff
- import { homedir } from 'node:os';
+ import { homedir } from 'os';
```

**why this matters:**
- consistency with extant imports
- grep for `from 'os'` finds all usages
- `node:` prefix would be an outlier

**verdict:** issue found and fixed. blueprint now uses `from 'os'` per codebase convention.

---

## convention 5: function structure (no new function)

**does the blueprint introduce new functions?**
no — all changes are inline within extant functions:
- `hydrateKeyrackRepoManifest` — changes value at 3 locations
- `mechAdapterGithubApp.acquireForSet` — adds 2 lines

**would new functions be needed?**
no — the changes are small enough to be inline:
- 1 line for tilde expansion
- 1 line per mech value change (3 total)

**verdict:** consistent. no new functions; changes are inline additions.

---

## summary

| convention | follows extant? | action |
|------------|-----------------|--------|
| `*Expanded` suffix | yes | none |
| `mech` field name | yes | none |
| regex style | yes | none |
| `os` import | yes (after fix) | fixed — changed `node:os` to `os` |
| function structure | yes | none |

---

## conclusion

**one issue found and fixed:**
- blueprint had `from 'node:os'` — codebase uses `from 'os'`
- fixed blueprint to use `from 'os'`

**why the fix holds:**
- codebase has 5 imports `from 'os'`, 0 imports `from 'node:os'`
- consistency enables grep-based discovery
- no functional difference, only convention alignment

**all conventions now follow extant patterns:**
- variable names use `*Expanded` suffix
- field names use extant types
- regex uses anchored style
- imports use unprefixed node builtins
- changes are inline (no new functions)
