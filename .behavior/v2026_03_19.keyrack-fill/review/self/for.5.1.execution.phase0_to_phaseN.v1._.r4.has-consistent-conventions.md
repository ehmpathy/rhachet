# review.self: has-consistent-conventions (r4)

## verdict: pass

fillKeyrackKeys follows all extant name conventions and structural patterns. this review walks through each name and structure choice with line-level comparison to extant code.

## line-by-line analysis

### operation name: fillKeyrackKeys

**fillKeyrackKeys.ts:36:**
```ts
export const fillKeyrackKeys = async (
```

**convention check:** `[verb]Keyrack[Noun]s` pattern

| extant operation | verb | structure |
|------------------|------|-----------|
| unlockKeyrackKeys (line 22) | unlock | verb + Keyrack + Keys |
| setKeyrackKey (line 18) | set | verb + Keyrack + Key |
| delKeyrackKey (line 10) | del | verb + Keyrack + Key |
| fillKeyrackKeys (line 36) | fill | verb + Keyrack + Keys |

**why plural Keys?** operations that act on multiple slugs use plural:
- unlockKeyrackKeys loops over `slugsForEnv` (line 122)
- fillKeyrackKeys loops over `slugs` (line 92)

operations that act on one slug per call use singular:
- setKeyrackKey computes `targetSlugs` but expects one key name input

verdict: **consistent** — plural matches multi-key scope

---

### input parameter: env

**fillKeyrackKeys.ts:38:**
```ts
env: string;
```

**extant comparison:**

unlockKeyrackKeys.ts:25:
```ts
env?: string;
```

**difference:** fillKeyrackKeys requires env, unlockKeyrackKeys optional.

**why this is correct:**
- unlockKeyrackKeys can unlock sudo keys without env context
- fillKeyrackKeys always needs env to filter manifest keys

verdict: **consistent** — required where needed, optional where not

---

### input parameter: owners

**fillKeyrackKeys.ts:39:**
```ts
owners: string[];
```

**no extant comparison:** this is unique to fill (multi-owner orchestration)

**convention check:** plural array matches other array params:

getAllKeyrackSlugsForEnv returns `string[]` (slug array)
unlockKeyrackKeys returns `{ unlocked: KeyrackKeyGrant[] }` (array in return)

verdict: **consistent** — plural name for array type

---

### input parameter: prikeys

**fillKeyrackKeys.ts:40:**
```ts
prikeys: string[];
```

**convention check:** prikey is the extant term

genKeyrackHostContext.ts:40:
```ts
prikey?: string | null;
```

fillKeyrackKeys uses `prikeys` (plural) for array of paths.

verdict: **consistent** — extant term, pluralized for array

---

### local variable: ownerInput

**fillKeyrackKeys.ts:102:**
```ts
const ownerInput = input.owners[ownerIdx]!;
```

**convention check:** `[noun][Qualifier]` order

extant patterns:
- `slugsForEnv` (unlockKeyrackKeys:51)
- `keysToUnlock` (unlockKeyrackKeys:120)
- `repoManifest` (many files)

`ownerInput` follows `[noun][Source]` pattern — what came from input.

verdict: **consistent**

---

### local variable: prikeyFound

**fillKeyrackKeys.ts:116:**
```ts
let prikeyFound: string | null = null;
```

**convention check:** `[noun][State]` order

extant patterns:
- `hostConfig` (unlockKeyrackKeys:124)
- `secretFound` would follow same pattern

`prikeyFound` = the prikey that was found to work

verdict: **consistent**

---

### local variable: hostContext

**fillKeyrackKeys.ts:113-115:**
```ts
let hostContext: Awaited<
  ReturnType<typeof genKeyrackHostContext>
> | null = null;
```

**extant comparison:**

setKeyrackKey.ts:32:
```ts
context: KeyrackHostContext,
```

both use `hostContext` or receive `context: KeyrackHostContext`

verdict: **consistent**

---

### local variable: vaultInferred

**fillKeyrackKeys.ts:153:**
```ts
const vaultInferred = inferKeyrackVaultFromKey({ keyName });
```

**convention check:** `[noun][How]` pattern

similar to how we'd name `slugParsed`, `valueDerived`

verdict: **consistent** — describes how the value was obtained

---

### type: FillKeyResult

**fillKeyrackKeys.ts:22-26:**
```ts
type FillKeyResult = {
  slug: string;
  owner: string;
  status: 'set' | 'skipped' | 'failed';
};
```

**convention check:** local types defined inline

extant patterns:
- types defined where used, not exported unless reused
- Result suffix for outcome types

verdict: **consistent**

---

### return type structure

**fillKeyrackKeys.ts:45-47:**
```ts
Promise<{
  results: FillKeyResult[];
  summary: { set: number; skipped: number; failed: number };
}>
```

**extant comparison:**

setKeyrackKey.ts:33-35:
```ts
Promise<{
  results: KeyrackKeyHost[];
}>
```

unlockKeyrackKeys.ts:30-32:
```ts
Promise<{
  unlocked: KeyrackKeyGrant[];
}>
```

fillKeyrackKeys adds `summary` — unique to orchestrator that tracks three states.

verdict: **consistent** — results array matches, summary is additive

---

### console output header

**fillKeyrackKeys.ts:86-88:**
```ts
console.log(
  `🔐 keyrack fill (env: ${input.env}, keys: ${slugs.length}, owners: ${input.owners.length})`,
);
```

**extant comparison:**

invokeKeyrack.ts (keyrack status command) uses:
```ts
console.log(`🔐 keyrack status (org: ${org})`);
```

pattern: `🔐 keyrack [command] ([key details])`

verdict: **consistent**

---

### console tree characters

**fillKeyrackKeys.ts:106-107:**
```ts
const ownerPrefix = isLastOwner ? '└─' : '├─';
const branchContinue = isLastOwner ? '   ' : '│  ';
```

**extant comparison:**

invokeKeyrack.ts:135-154 uses identical logic:
```ts
console.log(`   ├─ host manifest: ${hostStatus}`);
console.log(`   │   ├─ owner: ${result.host.owner ?? 'default'}`);
console.log(`   └─ repo manifest: ${repoStatus}`);
```

same characters: `├─`, `└─`, `│  `, 3-space indent

verdict: **consistent**

---

### error message format

**fillKeyrackKeys.ts:73-75:**
```ts
throw new BadRequestError(
  `key ${input.key} not found in manifest for env=${input.env}`,
);
```

**extant comparison:**

unlockKeyrackKeys.ts:85-88:
```ts
throw new BadRequestError(`sudo key not found: ${keyInput}`, {
  note: 'run: rhx keyrack set --key X --env sudo --vault ... to configure',
});
```

pattern: template literal with specific values in message

fillKeyrackKeys omits the `note` metadata — acceptable for simple errors.

verdict: **consistent**

---

### loop structure

**fillKeyrackKeys.ts:92:**
```ts
for (let i = 0; i < slugs.length; i++) {
```

**why indexed?** needs index for progress: `key ${i + 1}/${slugs.length}`

**extant comparison:**

unlockKeyrackKeys.ts:122:
```ts
for (const slug of slugsForEnv) {
```

uses `for...of` because no index needed for output.

fillKeyrackKeys uses indexed loop only where index needed.

verdict: **consistent** — indexed when needed, for...of otherwise

---

## summary table

| element | convention | fillKeyrackKeys | verdict |
|---------|------------|-----------------|---------|
| operation name | verb+Keyrack+Noun(s) | fillKeyrackKeys | pass |
| input params | (input, context) | yes | pass |
| array params | plural name | owners, prikeys | pass |
| local vars | noun+qualifier | ownerInput, prikeyFound | pass |
| return type | { results: T[] } | yes + summary | pass |
| console header | emoji + parens | 🔐 keyrack fill (...) | pass |
| tree chars | ├─ └─ │ | identical | pass |
| error format | BadRequestError + template | yes | pass |
| loop style | indexed when needed | yes | pass |

## conclusion

every name and structure in fillKeyrackKeys matches extant conventions. no divergence found. the code reads as a natural extension of the keyrack operations family.
