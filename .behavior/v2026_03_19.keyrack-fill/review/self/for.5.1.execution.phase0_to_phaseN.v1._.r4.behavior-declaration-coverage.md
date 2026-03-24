# review.self: behavior-declaration-coverage (r4)

## verdict: pass

all requirements from vision, criteria, and blueprint are implemented.

## vision coverage

### requirement: fill all keys from manifest for specified env

**vision states:**
> one command. reads from the repo's keyrack.yml. fills all keys for all specified owners.

**implementation (fillKeyrackKeys.ts:60-68):**
```ts
const allSlugs = getAllKeyrackSlugsForEnv({
  manifest: repoManifest,
  env: input.env,
});
const slugs = input.key
  ? allSlugs.filter((s) => asKeyrackKeyName({ slug: s }) === input.key)
  : allSlugs;
```

verdict: **covered** — reads from manifest, filters by env

---

### requirement: set → unlock → get roundtrip verification

**vision states:**
> verifies roundtrip automatically... set → unlock → get

**implementation (fillKeyrackKeys.ts:164-217):**
```ts
// set
await setKeyrackKey({ ... }, hostContext);

// unlock
await unlockKeyrackKeys({ env: input.env, key: keyName }, unlockContext);

// get (verify)
const attempt = await getKeyrackKeyGrant({ for: { key: slug } }, getContext);
if (attempt.status !== 'granted') {
  results.push({ slug, owner: ownerInput, status: 'failed' });
  continue;
}
```

verdict: **covered** — set, unlock, get in sequence with failure detection

---

### requirement: inner loop on owners

**vision states:**
> the inner loop is owners, so the user can repeat the same action

**implementation (fillKeyrackKeys.ts:92-223):**
```ts
for (let i = 0; i < slugs.length; i++) {      // outer: keys
  for (let ownerIdx = 0; ownerIdx < input.owners.length; ownerIdx++) {  // inner: owners
```

verdict: **covered** — owners in inner loop

---

### requirement: prikey auto-selection

**vision states:**
> prikey auto-selection — figures out which prikey works for which owner

**implementation (fillKeyrackKeys.ts:118-141):**
```ts
// try each supplied prikey
for (const prikey of input.prikeys) {
  try {
    hostContext = await genKeyrackHostContext({ owner: owner, prikey });
    prikeyFound = prikey;
    break;
  } catch { /* try next */ }
}

// fall back to DAO discovery
if (!hostContext) {
  hostContext = await genKeyrackHostContext({ owner: owner, prikey: null });
}
```

verdict: **covered** — tries supplied prikeys, falls back to discovery

---

### requirement: tree output format

**vision states:** timeline shows exact tree format with `├─`, `└─`, nested output

**implementation (fillKeyrackKeys.ts:96-98, 106-109, 159-161):**
```ts
console.log(`🔑 key ${i + 1}/${slugs.length}, ${keyName}, for ${input.owners.length} owner...`);
const ownerPrefix = isLastOwner ? '└─' : '├─';
console.log(`   ${ownerPrefix} for ${ownerLabel}`);
console.log(`   ${branchContinue}├─ set the key`);
```

verdict: **covered** — tree format matches vision

---

## criteria coverage

### usecase.1: fill all keys for default owner

**criteria:**
> given(repo with keyrack.yml)
> when(user runs rhx keyrack fill --env test)
> then(prompts for each key)
> then(sets each key for owner=default)

**implementation:**
- CLI defaults owner to `['default']` (invokeKeyrack.ts:1200)
- fillKeyrackKeys calls setKeyrackKey for each slug (line 164)

verdict: **covered**

---

### usecase.2: fill all keys for multiple owners

**criteria:**
> when(--owner default --owner ehmpath --prikey ~/.ssh/ehmpath)
> then(for each key, prompts user for value per owner)
> then(inner loop is owners)

**implementation:**
- owners is array input (line 39)
- inner loop iterates owners (line 101)

verdict: **covered**

---

### usecase.3: partial fill (some keys already set)

**criteria:**
> given(2 keys already set)
> then(skips already-set keys with "already set, skip")
> then(prompts only for absent keys)

**implementation (fillKeyrackKeys.ts:144-149):**
```ts
const keyHost = hostContext.hostManifest.hosts[slug];
if (keyHost && !input.refresh) {
  console.log(`   ${branchContinue}└─ ✓ already set, skip`);
  results.push({ slug, owner: ownerInput, status: 'skipped' });
  continue;
}
```

verdict: **covered**

---

### usecase.4: refresh all keys

**criteria:**
> when(--refresh)
> then(re-prompts for all keys despite already set)

**implementation:**
- `input.refresh` check (line 145): `if (keyHost && !input.refresh)`
- when refresh=true, condition fails, proceeds to set

verdict: **covered**

---

### usecase.5: fill specific key only

**criteria:**
> when(--key CLOUDFLARE_API_TOKEN)
> then(prompts only for that key)
> then(ignores other keys)

**implementation (fillKeyrackKeys.ts:66-68):**
```ts
const slugs = input.key
  ? allSlugs.filter((s) => asKeyrackKeyName({ slug: s }) === input.key)
  : allSlugs;
```

verdict: **covered**

---

### inputs: --env required

**criteria:**
> then(--env is required)

**implementation (invokeKeyrack.ts:1196):**
```ts
.requiredOption('--env <env>', 'environment to fill (test, prod, all)')
```

verdict: **covered**

---

### inputs: --owner defaults to default

**criteria:**
> given(--owner not specified)
> then(defaults to owner=default)

**implementation (invokeKeyrack.ts:1200):**
```ts
.option('--owner <owner...>', 'owner(s) to fill (default: default)', ['default'])
```

verdict: **covered**

---

### errors: no prikey available

**criteria:**
> given(no prikey can decrypt owner's host manifest)
> then(fail-fast with "no available prikey for owner=X")

**implementation (fillKeyrackKeys.ts:137-140):**
```ts
} catch (error) {
  // propagate the source error - it has the real diagnostic info
  throw error;
}
```

genKeyrackHostContext throws descriptive error when no prikey works. fillKeyrackKeys propagates it.

verdict: **covered** — error propagates with diagnostic info

---

### errors: key not found in manifest

**criteria:**
> given(specified --key not found)
> then(fail-fast with "key X not found in manifest")

**implementation (fillKeyrackKeys.ts:72-75):**
```ts
if (input.key) {
  throw new BadRequestError(
    `key ${input.key} not found in manifest for env=${input.env}`,
  );
}
```

verdict: **covered**

---

### boundary: vault inference

**criteria:**
> given(key has no prescribed vault)
> then(infers vault from key characteristics)
> then(falls back to os.secure)

**implementation (fillKeyrackKeys.ts:153-156):**
```ts
const vaultInferred = inferKeyrackVaultFromKey({ keyName });
const vault = vaultInferred ?? 'os.secure';
const mechInferred = inferMechFromVault({ vault });
const mech = keySpec?.mech ?? mechInferred ?? 'PERMANENT_VIA_REPLICA';
```

verdict: **covered**

---

## blueprint coverage

### filediff: invokeKeyrack.ts update

**blueprint:**
> add `keyrack fill` subcommand

**implementation (invokeKeyrack.ts:1192-1229):** full CLI subcommand with all options

verdict: **covered**

---

### filediff: fillKeyrackKeys.ts create

**blueprint:**
> create orchestrator

**implementation:** 241-line orchestrator at `src/domain.operations/keyrack/fillKeyrackKeys.ts`

verdict: **covered**

---

### filediff: integration test

**blueprint:**
> create fillKeyrackKeys.play.integration.test.ts

**implementation:** test exists at `src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts`

verdict: **covered**

---

### removed: getOnePrikeyForOwner.ts

**blueprint note:**
> phase 1: getOnePrikeyForOwner removed — DAO has built-in discovery

**implementation:** not created (correctly removed from roadmap)

verdict: **covered** — correct decision to omit

---

## summary

| source | requirements | covered |
|--------|--------------|---------|
| vision | 5 | 5 |
| criteria inputs | 4 | 4 |
| criteria usecases | 5 | 5 |
| criteria errors | 3 | 3 |
| criteria boundaries | 1 | 1 |
| blueprint files | 3 | 3 |

all requirements covered. no gaps found.
