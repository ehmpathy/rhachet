# self-review r8: has-consistent-mechanisms

## purpose

review for new mechanisms that duplicate extant functionality. unless the ask was to refactor, be consistent with extant mechanisms.

---

## mechanism 1: tilde expansion in mechAdapterGithubApp

**the mechanism:**
```ts
pemPath.trim().replace(/^~(?=$|\/|\\)/, homedir())
```

**does the codebase have an extant utility for this?**
searched for: `expandPath`, `resolvePath`, `expandHome`, `expandTilde`.

result: no extant utility. the codebase handles `~` inline at 6 locations:

| file | line | pattern | purpose |
|------|------|---------|---------|
| `invokeKeyrack.ts` | 123 | `p.replace(HOME, '~')` | display (reverse) |
| `findDefaultSshKey.ts` | 31 | `process.env.HOME ?? homedir()` | home path access |
| `discoverIdentities.ts` | 19 | `process.env.HOME ?? homedir()` | home path access |
| `discoverIdentityForRecipient.ts` | 108 | `process.env.HOME ?? homedir()` | home path access |
| `getKeyrackHostManifestPath.ts` | 9 | `process.env.HOME` (doc only) | home path access |
| `vaultAdapterOsDirect.ts` | 34 | `process.env.HOME` (doc only) | home path access |

**why no centralized utility?**
each location has distinct needs:
1. **test isolation** — `process.env.HOME` preferred because tests can mutate env
2. **display** — reverse expansion: home → `~` for human-readable output
3. **file access** — `homedir()` or `process.env.HOME` for actual paths

the blueprint's case is **file access with user-provided path**. this is unique:
- user types `~/.ssh/my.pem`
- code must expand to `/home/user/.ssh/my.pem` before `readFileSync`
- no other location in codebase receives user-typed paths with `~`

**could we extract a utility?**
a `expandTildePath()` utility:
- usage count: 1 (only this location)
- complexity: 1 line of code
- maintenance cost: new file, new import, new test
- benefit: reuse for future user-typed paths

YAGNI analysis:
- no future usecases visible (other user-typed paths use CLI args, which shell expands)
- this is the only mech adapter that reads a user-provided file path
- to extract would anticipate a future that may never come

**verdict:** consistent. inline fix matches codebase style. no extant utility to reuse. no justification to create one for single usage.

---

## mechanism 2: nullable mech in KeyrackKeySpec

**the mechanism:**
change hydration to set `mech: null` instead of `mech: 'PERMANENT_VIA_REPLICA'`.

**does the codebase already support nullable mech?**
yes — KeyrackKeySpec type definition at line 21:
```ts
mech: KeyrackGrantMechanism | null;
```

**the key insight:**
the type was ALREADY nullable. the blueprint does NOT change the type definition. it changes the VALUE that hydration assigns.

**before:** type allows null, but hydration ignores this and sets concrete value
**after:** type allows null, and hydration uses null to express "undeclared"

**the domain model:**

| type | mech | domain meaning |
|------|------|----------------|
| `KeyrackKeySpec` | `null` allowed | "manifest declares no mech constraint" |
| `KeyrackKeySpec` | `PERMANENT_VIA_REPLICA` | "manifest declares static secret" |
| `KeyrackKeySpec` | `EPHEMERAL_VIA_GITHUB_APP` | "manifest declares ephemeral token" |
| `KeyrackKeyHost` | never null | "host has resolved/stored a concrete mech" |
| `KeyrackKeyGrant` | never null | "grant has a concrete mech (was unlocked)" |

**why hydration was wrong:**
1. manifest YAML does not declare mech (no `mech:` field in keys)
2. hydration should express "no constraint" = `null`
3. hydration was incorrectly hardcode to `'PERMANENT_VIA_REPLICA'`
4. downstream code saw concrete mech, skipped prompt

**why this fix is consistent:**
- uses extant nullable type exactly as designed
- aligns with domain semantics (spec = declared, host = resolved)
- no new type, no new field, no new mechanism

**verdict:** consistent. uses extant type exactly as designed. fixes incorrect value assignment.

---

## mechanism 3: mech inference in vault adapter

**the mechanism:**
pass `mech: null` to vault.set → vault invokes `inferKeyrackMechForSet`.

**does the codebase already have this flow?**
yes — the flow exists and is used by `keyrack set`:

```
keyrack set --key X [no --mech]
  └── vault.set({ mech: null })
      └── inferKeyrackMechForSet({ vault, slug })
          ├── single mech supported → auto-select
          └── multiple mechs → prompt user
```

the file is at `src/domain.operations/keyrack/adapters/vaults/inferKeyrackMechForSet.ts`.

**how fill uses this flow:**

blueprint codepath tree shows:
```
fillKeyrackKeys
└── vault.set({ slug, mech: keySpec?.mech ?? null, ... })
```

**where does the `keySpec?.mech ?? null` come from?**
1. `fillKeyrackKeys` reads `keySpec` from repo manifest via hydration
2. hydration sets `keySpec.mech = null` (after fix)
3. `fillKeyrackKeys` passes `null` to `vault.set`
4. `vault.set` sees null, calls `inferKeyrackMechForSet`
5. `inferKeyrackMechForSet` prompts if multiple mechs

**could fill implement its own mech selection?**
yes, but:
1. `inferKeyrackMechForSet` already handles prompts, validation, vault filtering
2. duplicates logic = inconsistency risk
3. vision says "same flow as set" — reuse is the intent

**could fill add a shortcut that bypasses vault.set?**
no — vault.set encapsulates:
- mech selection
- secret acquisition (via mech adapter)
- secret storage
- roundtrip verification

to bypass vault.set = duplicate all this = maintenance burden

**verdict:** consistent. fill reuses extant mechanism via passthrough. no new inference logic. no duplication of vault.set internals.

---

## mechanism 4: hydration at 3 locations

**the mechanism:**
change `mech: 'PERMANENT_VIA_REPLICA'` to `mech: null` at 3 locations in `hydrateKeyrackRepoManifest.ts`.

**the 3 locations:**

| location | line | source | produces |
|----------|------|--------|----------|
| env.all | 83-89 | `envAllEntries` | keys declared in `env.all` section |
| expanded | 97-103 | `declaredEnvs + envAllEntries` | env.all keys expanded to each declared env |
| env-specific | 112-118 | `declaredEnvs + envEntries` | keys declared for specific env |

**is this duplicated code?**
no — each branch handles semantically distinct input:

```ts
// branch 1: env.all keys
for (const [key, grade] of envAllEntries) {
  keys[slug] = new KeyrackKeySpec({ slug, mech: null, env: 'all', ... });
}

// branch 2: expanded keys (env.all → each env)
for (const [envName] of declaredEnvs) {
  for (const [key, grade] of envAllEntries) {
    keys[slug] = new KeyrackKeySpec({ slug, mech: null, env: envName, ... });
  }
}

// branch 3: env-specific keys
for (const [envName] of declaredEnvs) {
  for (const [key, grade] of envEntries) {
    keys[slug] = new KeyrackKeySpec({ slug, mech: null, env: envName, ... });
  }
}
```

**why not a factory?**
a factory like `createKeySpec({ slug, env, name, grade })`:

| pro | con |
|-----|-----|
| centralizes `mech: null` | obscures what happens in each branch |
| single point of change | adds indirection for 1 field |
| | factory exists for one pattern (mech: null) |

the current structure is explicit: each branch shows full construction. reader sees exactly what happens without jump to factory.

**is there an extant factory for KeyrackKeySpec?**
no — KeyrackKeySpec uses `new KeyrackKeySpec()` directly everywhere. no factory pattern in codebase.

to add a factory for this one usecase = inconsistent with codebase style.

**verdict:** consistent. 3 locations are semantically distinct branches that happen to set the same value. no factory extant. inline construction matches codebase style.

---

## summary

| mechanism | duplicates extant? | action |
|-----------|-------------------|--------|
| tilde expansion | no — no utility extant | inline fix is appropriate |
| nullable mech | no — type already allows | leverages extant type |
| mech inference | no — reuses inferKeyrackMechForSet | pass-through, no new logic |
| 3 hydration locations | no — distinct branches | each branch is semantically different |

---

## conclusion

**no extant mechanisms duplicated.**

| mechanism | extant to reuse? | new to create? | action |
|-----------|-----------------|----------------|--------|
| tilde expansion | no utility extant | no — 1 usage | inline fix |
| nullable mech | yes — type already allows | no | use extant type |
| mech inference | yes — inferKeyrackMechForSet | no | pass null through |
| 3 hydration locations | no factory extant | no — style mismatch | inline construction |

**why each holds:**

1. **tilde expansion** — searched codebase, no expandTilde utility. each location handles home dir differently. inline is consistent.

2. **nullable mech** — type definition already allows null. blueprint uses it correctly. no new type mechanism.

3. **mech inference** — extant mechanism does exactly what we need. fill passes null, vault calls inference. zero new code.

4. **3 hydration locations** — no factory pattern for KeyrackKeySpec in codebase. 3 locations are semantically distinct branches. inline construction is consistent.

**what we did NOT do:**
- create `expandTildePath()` utility (YAGNI — 1 usage)
- create `KeyrackKeySpecFactory` (inconsistent — no factory extant)
- add mech inference to fill (duplication — vault already does it)
- add new type `MechConstraint` (unnecessary — null suffices)

no refactor needed for mechanism consistency.
