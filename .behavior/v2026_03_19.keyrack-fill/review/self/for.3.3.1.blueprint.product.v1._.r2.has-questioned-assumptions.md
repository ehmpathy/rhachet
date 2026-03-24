# self-review r2: has-questioned-assumptions (deeper)

## critical discovery: prikey signature mismatch

### the assumption

the blueprint assumes genKeyrackHostContext accepts a prikeys array:

```ts
const hostContext = await genKeyrackHostContext({
  cwd: context.cwd,
  owner,
  prikeys: input.prikeys,  // <-- array
});
```

### the reality

checked the actual function signature in `src/domain.operations/keyrack/genKeyrackHostContext.ts`:

```ts
export const genKeyrackHostContext = async (input: {
  owner: string | null;
  prikey: string | null;  // <-- single prikey, not array
}): Promise<KeyrackHostContext>
```

### impact

the blueprint's orchestrator cannot pass a prikey pool directly. the design needs adjustment.

### options

**option A: iterate through prikey pool until one works**

```ts
// try each prikey until one decrypts the host manifest
let hostContext: KeyrackHostContext | null = null;
const prikeysToTry = [...discoveredPrikeys, ...input.prikeys];

for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({
      owner,
      prikey,
    });
    break; // found one that works
  } catch (error) {
    continue; // try next
  }
}

if (!hostContext) {
  throw new BadRequestError(`no available prikey for owner=${owner}`);
}
```

**option B: let daoKeyrackHostManifest handle discovery**

checked `daoKeyrackHostManifest.get()` - when prikey is null, it uses `getAllAvailableIdentities()` for discovery. so:

```ts
// pass null to let the DAO discover available identities
const hostContext = await genKeyrackHostContext({
  owner,
  prikey: null, // discovery mode
});
```

but this doesn't use the user's `--prikey` flags.

**option C: create genKeyrackHostContextWithPrikeyPool**

new wrapper that handles the iteration:

```ts
export const genKeyrackHostContextWithPrikeyPool = async (input: {
  owner: string | null;
  prikeys: string[];
}): Promise<KeyrackHostContext>
```

### verdict

**option A is simplest for v1.** no new primitives needed. the orchestrator iterates through the prikey pool itself. fail-fast if none work.

### blueprint update needed

update fillKeyrackKeys to iterate prikeys:

```ts
// 7. find a prikey that works for this owner
let hostContext: KeyrackHostContext | null = null;
const prikeysToTry = input.prikeys.length > 0 ? input.prikeys : [null]; // null = discovery

for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({
      owner,
      prikey,
    });
    break;
  } catch {
    continue;
  }
}

if (!hostContext) {
  throw new BadRequestError(`no available prikey for owner=${owner}`);
}
```

---

## re-examine other assumptions with fresh eyes

### assumption: daoKeyrackHostManifest.get() returns hosts keyed by slug

**checked:** yes. `hostManifest.hosts[slug]` accesses the key host config.

**verdict: holds.**

### assumption: setKeyrackKey accepts org from repoManifest

**checked:** setKeyrackKey signature:

```ts
export const setKeyrackKey = async (
  input: {
    key: string;
    env: string;
    org: string;
    vault: KeyrackVault;
    mech: KeyrackMech;
    secret: string;
  },
  context: KeyrackHostContext,
)
```

**verdict: holds.** org is a required input.

### assumption: unlockKeyrackKeys context generator exists

**checked:** `genContextKeyrackGrantUnlock` exists in `src/domain.operations/keyrack/genContextKeyrackGrantUnlock.ts`.

**signature:**
```ts
export const genContextKeyrackGrantUnlock = async (input: {
  owner: string | null;
  gitroot: string;         // <-- NOT cwd
  prikey: string | null;   // <-- single, NOT array
}): Promise<ContextKeyrackGrantUnlock>
```

**findings:**
1. uses `gitroot` not `cwd` - blueprint uses wrong parameter name
2. uses single `prikey` not `prikeys` array - same issue as hostContext

**verdict: needs fix.** blueprint must use `gitroot` and single `prikey`.

### assumption: getKeyrackKeyGrant context generator exists

**checked:** `genContextKeyrackGrantGet` exists in `src/domain.operations/keyrack/genContextKeyrackGrantGet.ts`.

**signature:**
```ts
export const genContextKeyrackGrantGet = async (input: {
  gitroot: string;         // <-- NOT cwd
  owner: string | null;
}): Promise<ContextKeyrackGrantGet>
```

**findings:**
1. uses `gitroot` not `cwd` - blueprint uses wrong parameter name
2. no prikey needed - get reads from unlocked sources only

**verdict: needs fix.** blueprint must use `gitroot`.

---

## summary of r2 discoveries

### critical signature mismatches

| function | blueprint assumes | actual |
|----------|-------------------|--------|
| genKeyrackHostContext | `prikeys: string[]` | `prikey: string \| null` |
| genContextKeyrackGrantUnlock | `cwd`, `prikeys` | `gitroot`, `prikey` |
| genContextKeyrackGrantGet | `cwd` | `gitroot` |

### required blueprint fixes

1. **iterate through prikeys** - orchestrator must try each prikey until one works
2. **use `gitroot` not `cwd`** - all context generators use gitroot
3. **pass single prikey** - not array, for both hostContext and unlockContext

### verified assumptions

- setKeyrackKey signature matches blueprint
- hostManifest.hosts[slug] access pattern is correct
- getAllKeyrackSlugsForEnv handles extends properly
- genContextKeyrackGrantUnlock exists
- genContextKeyrackGrantGet exists

### updated orchestrator pattern

```ts
// iterate through prikeys to find one that works for this owner
// always try discovery (null) first, then supplied prikeys extend the set
const prikeysToTry = [null, ...input.prikeys];
let prikeyFound: string | null = null;
let hostContext: KeyrackHostContext | null = null;

for (const prikey of prikeysToTry) {
  try {
    hostContext = await genKeyrackHostContext({ owner, prikey });
    prikeyFound = prikey;
    break;
  } catch {
    continue;
  }
}

if (!hostContext) {
  throw new BadRequestError(`no available prikey for owner=${owner}`);
}

// use same prikey for unlock context
const unlockContext = await genContextKeyrackGrantUnlock({
  owner,
  gitroot: context.gitroot,  // NOT cwd
  prikey: prikeyFound,
});

// get context needs no prikey
const getContext = await genContextKeyrackGrantGet({
  owner,
  gitroot: context.gitroot,  // NOT cwd
});
```

**note:** r3 review found that the original prikey logic (`input.prikeys.length > 0 ? input.prikeys : [null]`) was backwards per the wish. the wish says `--prikey` extends discovered prikeys, not replaces them. fixed to `[null, ...input.prikeys]` — null triggers DAO discovery first, then supplied prikeys as fallback.

---

## all fixes applied to blueprint

| issue | fix | status |
|-------|-----|--------|
| prikey array → single prikey | iterate in orchestrator | ✓ applied |
| cwd → gitroot | use gitroot everywhere | ✓ applied |
| prikey discovery logic | `[null, ...input.prikeys]` | ✓ applied |
| inferKeyrackVaultFromKey param | use `keyName` not `key` | ✓ applied |
| vault/mech fallbacks | add fallback to os.secure | ✓ applied |

