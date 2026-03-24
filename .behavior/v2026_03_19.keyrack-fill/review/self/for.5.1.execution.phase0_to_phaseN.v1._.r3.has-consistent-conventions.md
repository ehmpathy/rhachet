# review.self: has-consistent-conventions (r3)

## verdict: pass

fillKeyrackKeys follows all extant name conventions and structural patterns in the keyrack domain.

## detailed analysis

### 1. operation name convention

**extant pattern:** `[verb]Keyrack[Noun]` or `[verb]Keyrack[Noun]s`

| operation | verb | noun | plural? |
|-----------|------|------|---------|
| `setKeyrackKey` | set | Key | singular (acts on one key per call) |
| `delKeyrackKey` | del | Key | singular |
| `unlockKeyrackKeys` | unlock | Keys | plural (unlocks multiple keys) |
| `getKeyrackKeyGrant` | get | KeyGrant | singular (returns one grant) |
| `fillKeyrackKeys` | fill | Keys | plural (fills multiple keys) |

**why fillKeyrackKeys is correct:**
- verb `fill` = orchestrates set+unlock+get sequence
- plural `Keys` = acts on multiple keys from manifest
- matches `unlockKeyrackKeys` pattern (multi-key operation)

**alternative considered:**
- `fillKeyrack` — rejected because it's ambiguous (fill what? the manifest? the daemon?)
- `setKeyrackKeys` — rejected because `set` implies direct mutation; `fill` implies check-then-set

### 2. input parameter conventions

**extant pattern:** operations use `(input: { ... }, context: ContextType)`

| operation | input keys | context type |
|-----------|------------|--------------|
| `setKeyrackKey` | key, env, org, vault, mech, ... | KeyrackHostContext |
| `unlockKeyrackKeys` | owner?, env?, key?, duration? | ContextKeyrackGrantUnlock |
| `fillKeyrackKeys` | env, owners, prikeys, key, refresh | { gitroot: string } |

**why fillKeyrackKeys context is minimal:**
fillKeyrackKeys generates its own host context per owner via genKeyrackHostContext. it only needs `gitroot` to:
- load repo manifest via daoKeyrackRepoManifest
- pass to genContextKeyrackGrantGet/Unlock

this matches orchestrator patterns that generate contexts internally rather than receive them.

### 3. return type conventions

**extant pattern:** operations return `Promise<{ [results]: Type[] }>`

| operation | return shape |
|-----------|--------------|
| `setKeyrackKey` | `{ results: KeyrackKeyHost[] }` |
| `unlockKeyrackKeys` | `{ unlocked: KeyrackKeyGrant[] }` |
| `fillKeyrackKeys` | `{ results: FillKeyResult[], summary: { set, skipped, failed } }` |

**why fillKeyrackKeys adds summary:**
- results array follows convention (array of per-item outcomes)
- summary is unique because fill has three outcome states (set/skipped/failed) vs binary outcomes
- summary enables quick success check without iterate over results

**FillKeyResult type:**
```ts
type FillKeyResult = {
  slug: string;
  owner: string;
  status: 'set' | 'skipped' | 'failed';
};
```

defined inline, local to file — matches pattern where types aren't reused elsewhere.

### 4. variable name conventions

**extant pattern:** `[noun][State]` order (per rule.require.order.noun_adj)

| variable | noun | state/qualifier |
|----------|------|-----------------|
| `ownerInput` | owner | Input (source) |
| `prikeyFound` | prikey | Found (state) |
| `hostContext` | host | Context (type) |
| `keySpec` | key | Spec (shape) |
| `vaultInferred` | vault | Inferred (how derived) |
| `mechInferred` | mech | Inferred (how derived) |

**comparison with extant operations:**

unlockKeyrackKeys uses:
- `slugsForEnv` — slugs + ForEnv qualifier
- `keysToUnlock` — keys + ToUnlock purpose

fillKeyrackKeys follows same pattern with `ownerInput`, `prikeyFound`, `vaultInferred`.

### 5. error message conventions

**extant pattern:** `[subject] [state/problem]` then fix hint in metadata

| operation | error message |
|-----------|---------------|
| `unlockKeyrackKeys` | `sudo credentials require --key flag` |
| `unlockKeyrackKeys` | `sudo key not found: ${keyInput}` |
| `fillKeyrackKeys` | `key ${input.key} not found in manifest for env=${input.env}` |
| `fillKeyrackKeys` | `no keyrack.yml found in repo` |

**consistency check:**
- message describes the problem clearly
- uses template literals with specific values
- follows "subject [problem]" structure

### 6. console output conventions

**extant pattern:** emoji header then tree structure

| command | header |
|---------|--------|
| `keyrack status` | `🔐 keyrack status (org: ${org})` |
| `keyrack unlock` | `🔐 keyrack unlock (env: ${env})` |
| `keyrack fill` | `🔐 keyrack fill (env: ${env}, keys: N, owners: N)` |

**tree characters:**
- `├─` for non-terminal
- `└─` for terminal
- `│  ` for continuation
- 3-space indent per level

fillKeyrackKeys uses identical patterns.

### 7. loop index conventions

**when indexed loop needed:**

fillKeyrackKeys uses indexed loops for progress display:
```ts
for (let i = 0; i < slugs.length; i++) {
  console.log(`🔑 key ${i + 1}/${slugs.length}, ...`);
```

this matches CLI patterns where progress feedback matters. non-indexed `for...of` used elsewhere in keyrack when index not needed.

### 8. boolean flag conventions

**extant pattern:** positive boolean names (what it does, not what it prevents)

| flag | semantics |
|------|-----------|
| `--refresh` | re-prompt even if set |
| `--force` (elsewhere) | skip confirmation |

fillKeyrackKeys uses `input.refresh` — positive name, matches extant flag conventions.

## patterns verified

| convention | fillKeyrackKeys | verdict |
|------------|-----------------|---------|
| operation name | fillKeyrackKeys (verb+Keyrack+Noun) | consistent |
| input/context shape | (input: {...}, context) | consistent |
| return type | Promise<{ results, summary }> | consistent |
| variable names | nounState order | consistent |
| error messages | subject + problem | consistent |
| console output | emoji + tree | consistent |
| loop patterns | indexed when progress needed | consistent |
| boolean flags | positive names | consistent |

## conclusion

fillKeyrackKeys introduces no new name conventions. all names, structures, and patterns match extant keyrack operations. the implementation can be read alongside unlockKeyrackKeys or setKeyrackKey without style shift.
