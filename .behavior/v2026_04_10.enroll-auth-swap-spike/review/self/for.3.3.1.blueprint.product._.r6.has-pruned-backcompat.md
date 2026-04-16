# self-review r6: has-pruned-backcompat

## the question

did we add backwards compatibility that was not explicitly requested? prune any unnecessary backcompat.

---

## backwards compatibility concerns reviewed

### concern 1: extant `rhx enroll` behavior

**blueprint reference**: `invokeEnroll.ts` marked `[~]` (modification)

**the change**: adds optional `--auth` flag to enrollment command

**why this is NOT a backcompat concern**:

the blueprint shows invokeEnroll.ts with three codepaths:
```
├── [+] parse --auth flag
├── [+] configure apiKeyHelper in enrollment config
└── [○] spawn brain cli (retain)
```

the `[○] spawn brain cli (retain)` marker is critical — extant enrollment flow is preserved. the `--auth` flag is additive:

| invocation | behavior |
|------------|----------|
| `rhx enroll` (today) | spawns brain cli, no brains auth config |
| `rhx enroll` (after) | spawns brain cli, no brains auth config — identical |
| `rhx enroll --auth $spec` (new) | spawns brain cli, **also** configures apiKeyHelper |

extant callers who omit `--auth` get identical behavior. no flag means no brains auth configuration — the enrollment proceeds as it did before. the flag enables an **extension**, not a **replacement**.

**verdict**: not a backcompat issue. optional flags that default to extant behavior are additive extensions.

---

### concern 2: keyrack SDK unchanged

**blueprint reference**: `getOneBrainAuthCredentialBySpec.ts` calls `keyrack.get({ key: slug })`

**the relationship**: brains auth is a **consumer** of keyrack, not a **producer** of keyrack

**why this is NOT a backcompat concern**:

the blueprint codepath shows:
```
├── keyrack.get({ key: slug }) → fetch token
└── if locked/absent → skip
```

this is the same `keyrack.get()` call that any other keyrack consumer uses. brains auth does not:
- modify keyrack domain objects
- change keyrack CLI signatures
- introduce new keyrack vault adapters

the distinction matters:

| relationship | backcompat concern? |
|--------------|---------------------|
| producer | yes — consumers depend on your contract |
| consumer | no — you depend on their contract |

we consume keyrack's stable public API (`keyrack.get`). if keyrack changes, we adapt — but our changes cannot break keyrack's extant consumers.

**verdict**: not a backcompat issue. consumers inherit stability from producers; they do not create stability debt.

---

### concern 3: BrainAuthAdapter contract

**blueprint reference**: `BrainAuthAdapter.ts` marked `[+]` (new file)

**the contract shape**:
```
├── slug: string
├── dao: BrainAuthAdapterDao
└── capacity: BrainAuthCapacityDao
```

**why this is NOT a backcompat concern**:

the `BrainAuthAdapter.ts` is **new infrastructure**. today:
- no prior BrainAuthAdapter contract exists
- no prior implementors of this contract exist
- brain suppliers will implement this contract fresh

when greenfield contracts ship:
- v1 contract is the first contract
- no migration from v0 required (v0 does not exist)
- future changes create migration debt **from v1**, not before v1

backcompat concerns exist when you modify extant contracts. this is a new contract with zero extant implementors.

**verdict**: not a backcompat issue. greenfield contracts have no prior version to break.

---

### concern 4: CLI output format

**blueprint reference**: `invokeBrainsAuth.ts` with subcommand `get`

**the commands**:
```
└── subcommand: get
    └── output: token value or exhausted error
```

**why this is NOT a backcompat concern**:

the `invokeBrainsAuth.ts` file is marked `[+]` (new file). the entire `brains auth` namespace is new:
- `npx rhachet brains auth get` — new command

no prior commands, no prior output format, no prior consumers. scripts that parse CLI output can only parse commands that exist. these commands do not exist today; therefore no scripts depend on their output format.

**verdict**: not a backcompat issue. new commands establish new contracts; they do not modify extant contracts.

---

## backcompat hacks scanned

blueprint must not contain patterns that signal hidden backcompat concerns:

| pattern | indicates | found? |
|---------|-----------|--------|
| `// backwards compat: ...` | explicit backcompat hack | no |
| `// legacy support: ...` | migration shim | no |
| `// deprecated: ...` | obsolescence path | no |
| fallback to old format | version migration | no |
| re-export under old name | rename migration | no |
| shim for removed feature | removal migration | no |

### scan result

**none found** — blueprint introduces new artifacts without fallback codepaths. this is expected for greenfield functionality where no prior version exists.

---

## why it holds

this blueprint is **greenfield functionality**:

| artifact | status | prior version? |
|----------|--------|----------------|
| `invokeBrainsAuth.ts` | `[+]` new | no prior file |
| `BrainAuthSpec.ts` | `[+]` new | no prior shape |
| `BrainAuthCapacity.ts` | `[+]` new | no prior shape |
| `BrainAuthCapacityDao.ts` | `[+]` new | no prior interface |
| `BrainAuthAdapterDao.ts` | `[+]` new | no prior interface |
| `BrainAuthAdapter.ts` | `[+]` new | no prior contract |
| `getOneBrainAuthCredentialBySpec.ts` | `[+]` new | no prior operation |
| `asBrainAuthSpecShape.ts` | `[+]` new | no prior transformer |
| `asBrainAuthTokenSlugs.ts` | `[+]` new | no prior transformer |
| `genApiKeyHelperCommand.ts` | `[+]` new | no prior transformer |

the only modification is `invokeEnroll.ts` marked `[~]`, and that modification is **additive** (optional `--auth` flag with preserve of extant codepath via `[○]` marker).

**zero extant users**: there are no consumers of brains auth functionality today. the first release establishes v1 contracts.

---

## summary

| category | count |
|----------|-------|
| concerns reviewed | 4 |
| backcompat hacks | 0 |
| open questions | 0 |
| producer relationships | 0 |
| consumer relationships | 1 (keyrack) |

**result**: zero backwards compatibility concerns. this is greenfield functionality with no prior users to break.
