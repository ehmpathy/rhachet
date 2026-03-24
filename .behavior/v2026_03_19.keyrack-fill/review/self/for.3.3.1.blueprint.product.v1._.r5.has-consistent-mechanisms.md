# self-review r5: has-consistent-mechanisms (code-level analysis)

## the question

does fillKeyrackKeys duplicate extant mechanisms? does it follow extant patterns?

---

## code-level pattern analysis

### pattern 1: (input, context) signature

**extant:**

```ts
// setKeyrackKey.ts:18
export const setKeyrackKey = async (
  input: { key: string; env: string; ... },
  context: KeyrackHostContext,
): Promise<{ results: KeyrackKeyHost[] }> => { ... }

// getKeyrackKeyGrant.ts:181
export async function getKeyrackKeyGrant(
  input: { for: { repo: true }; env?: string; slugs: string[]; ... },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt[]>

// unlockKeyrackKeys.ts:22
export const unlockKeyrackKeys = async (
  input: { owner?: string | null; env?: string; ... },
  context: ContextKeyrackGrantUnlock,
): Promise<{ unlocked: KeyrackKeyGrant[] }> => { ... }
```

**blueprint:**

```ts
// fillKeyrackKeys (proposed)
export const fillKeyrackKeys = async (
  input: { env: string; owners: string[]; prikeys: string[]; ... },
  context: { gitroot: string; log: LogMethods },
): Promise<{ results: FillKeyResult[]; summary: { ... } }> => { ... }
```

**verdict:** follows extant (input, context) pattern exactly.

---

### pattern 2: loop over slugs

**extant setKeyrackKey:**

```ts
// setKeyrackKey.ts:42-60
for (const slug of targetSlugs) {
  const keyHost = await setKeyrackKeyHost({ slug, ... }, context);
  results.push(keyHost);
}
return { results };
```

**extant unlockKeyrackKeys:**

```ts
// unlockKeyrackKeys.ts:122-208
for (const slug of slugsForEnv) {
  const hostConfig = context.hostManifest.hosts[slug];
  if (!hostConfig) continue;
  // ... unlock vault, get secret, collect key
  keysToUnlock.push(new KeyrackKeyGrant({ ... }));
}
```

**extant getKeyrackKeyGrant:**

```ts
// getKeyrackKeyGrant.ts:218-224
for (const slug of slugs) {
  const attempt = await attemptGrantKey({ slug, allowDangerous }, context);
  attempts.push(attempt);
}
return attempts;
```

**blueprint:**

```ts
// fillKeyrackKeys (proposed)
for (const slug of slugs) {
  for (const owner of input.owners) {
    // ... set, unlock, get
    results.push({ slug, owner, status: '...' });
  }
}
return { results, summary };
```

**verdict:** follows extant loop-and-aggregate pattern. adds inner owner loop (new orchestration, not duplication).

---

### pattern 3: error handle

**extant setKeyrackKey:**
- delegates error handle to setKeyrackKeyHost

**extant unlockKeyrackKeys:**

```ts
// unlockKeyrackKeys.ts:56-58
throw new BadRequestError('sudo credentials require --key flag', { note: '...' });

// unlockKeyrackKeys.ts:93-95
throw new UnexpectedCodePathError('no keyrack.yml found in repo', { note: '...' });

// unlockKeyrackKeys.ts:137-138
throw new UnexpectedCodePathError('vault adapter not found', { vault });
```

**extant getKeyrackKeyGrant:**

```ts
// getKeyrackKeyGrant.ts:83-85
throw new UnexpectedCodePathError('mechanism adapter not found', { mech });
```

**blueprint:**

```ts
// fillKeyrackKeys (proposed)
throw new BadRequestError(`no available prikey for owner=${owner}`);
throw new BadRequestError('value cannot be empty');
throw new BadRequestError(`key ${input.key} not found in manifest for env=${input.env}`);
```

**verdict:** follows extant error patterns (BadRequestError for input validation, UnexpectedCodePathError for internal invariants).

---

### pattern 4: reuse of primitives

| blueprint operation | reuses | modification |
|---------------------|--------|--------------|
| load repo manifest | daoKeyrackRepoManifest.get() | none |
| get slugs for env | getAllKeyrackSlugsForEnv() | none |
| check if key set | daoKeyrackHostManifest.get() | none |
| infer vault | inferKeyrackVaultFromKey() | none |
| prompt for secret | promptHiddenInput() | none |
| set key | setKeyrackKey() | none |
| unlock key | unlockKeyrackKeys() | none |
| verify roundtrip | getKeyrackKeyGrant() | none |

**verdict:** all calls use extant primitives with unmodified interfaces.

---

### pattern 5: context generation

**extant:**

```ts
// unlockKeyrackKeys uses ContextKeyrackGrantUnlock
// getKeyrackKeyGrant uses ContextKeyrackGrantGet
// setKeyrackKey uses KeyrackHostContext
```

**blueprint:**

```ts
// fillKeyrackKeys generates contexts via:
hostContext = await genKeyrackHostContext({ owner, prikey });
await genContextKeyrackGrantUnlock({ owner, gitroot, prikey });
await genContextKeyrackGrantGet({ owner, gitroot });
```

**verdict:** uses extant context generators. does not create new context types.

---

## anti-duplication analysis

### question: does fillKeyrackKeys duplicate setKeyrackKey loop?

setKeyrackKey loops over `targetSlugs` (derived from input.key, input.env, input.org).
fillKeyrackKeys loops over `slugs` (derived from manifest for input.env).

**difference:** setKeyrackKey receives a single key and expands it. fillKeyrackKeys discovers all keys from manifest.

**verdict:** different iteration sources. no duplication.

### question: does fillKeyrackKeys duplicate unlockKeyrackKeys loop?

unlockKeyrackKeys loops over `slugsForEnv` from repoManifest to unlock each.
fillKeyrackKeys loops over `slugs` from manifest but calls unlockKeyrackKeys for one key at a time.

**difference:** unlockKeyrackKeys does bulk unlock. fillKeyrackKeys orchestrates per-key, per-owner calls to extant operations.

**verdict:** different cardinality of operation. fillKeyrackKeys is a new orchestration layer that calls unlockKeyrackKeys. no duplication.

### question: does fillKeyrackKeys duplicate getKeyrackKeyGrant loop?

getKeyrackKeyGrant loops when given `{ for: { repo: true }, slugs: [...] }`.
fillKeyrackKeys calls getKeyrackKeyGrant per key per owner for verification.

**difference:** getKeyrackKeyGrant provides batch grant resolution. fillKeyrackKeys uses it for single-key verification as part of a larger workflow.

**verdict:** different purposes. fillKeyrackKeys uses getKeyrackKeyGrant as a primitive. no duplication.

---

## what fillKeyrackKeys adds (not duplicates)

| new behavior | reason | extant alternative? |
|--------------|--------|---------------------|
| outer loop over manifest keys | discovers all keys | none — extant ops take single key |
| inner loop over owners | fills multiple owners | none — extant ops take single owner |
| prikey discovery iteration | tries prikeys until one works | none — extant ops take single prikey |
| skip-if-set idempotency | avoids re-prompt | none — extant set always overwrites |
| result aggregation | tracks set/skipped/failed | none — extant ops return single result |

each "new" behavior is orchestration over extant primitives. no new domain logic is created.

---

## conclusion

fillKeyrackKeys:
- follows extant (input, context) signature pattern
- follows extant loop-and-aggregate pattern
- follows extant error patterns (BadRequestError, UnexpectedCodePathError)
- reuses all extant primitives with unmodified interfaces
- generates contexts via extant context generators
- adds orchestration over keys × owners — a new layer, not duplication

| extant primitive | fillKeyrackKeys call | modification |
|------------------|---------------------|--------------|
| setKeyrackKey | per key per owner | none |
| unlockKeyrackKeys | per key per owner | none |
| getKeyrackKeyGrant | per key per owner | none |
| getAllKeyrackSlugsForEnv | once per invocation | none |
| inferKeyrackVaultFromKey | per key | none |
| promptHiddenInput | per key per owner | none |
| genKeyrackHostContext | per owner | none |

**no duplication found.** fillKeyrackKeys is a new orchestration layer that composes extant primitives without copy of their logic.

