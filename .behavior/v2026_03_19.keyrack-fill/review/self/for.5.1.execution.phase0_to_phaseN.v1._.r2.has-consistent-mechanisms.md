# review.self: has-consistent-mechanisms (r2)

## verdict: pass

no new mechanisms duplicate extant functionality. fillKeyrackKeys reuses extant components throughout.

## detailed review

### imports analysis

all imports in fillKeyrackKeys.ts reuse extant mechanisms:

| import | type | reused from |
|--------|------|-------------|
| BadRequestError | error class | helpful-errors |
| daoKeyrackRepoManifest | DAO | @src/access/daos |
| inferMechFromVault | utility | @src/infra |
| promptHiddenInput | utility | @src/infra |
| asKeyrackKeyName | utility | extant in keyrack/ |
| genContextKeyrackGrantGet | context generator | extant in keyrack/ |
| genContextKeyrackGrantUnlock | context generator | extant in keyrack/ |
| genKeyrackHostContext | context generator | extant in keyrack/ |
| getAllKeyrackSlugsForEnv | utility | extant in keyrack/ |
| getKeyrackKeyGrant | operation | extant in keyrack/ |
| inferKeyrackVaultFromKey | utility | extant in keyrack/ |
| unlockKeyrackKeys | operation | extant in keyrack/session/ |
| setKeyrackKey | operation | extant in keyrack/ |

### mechanism reuse analysis

#### 1. repo manifest load

```ts
// fillKeyrackKeys.ts:50-57
const repoManifest = await daoKeyrackRepoManifest.get({
  gitroot: context.gitroot,
});
```

**reuses:** daoKeyrackRepoManifest.get() — the extant DAO for repo manifest access.

**alternatives considered:** none. this is the canonical way to load repo manifests.

#### 2. key enumeration

```ts
// fillKeyrackKeys.ts:60-68
const allSlugs = getAllKeyrackSlugsForEnv({
  manifest: repoManifest,
  env: input.env,
});
```

**reuses:** getAllKeyrackSlugsForEnv() — the extant utility that extracts keys from manifest.

**alternatives considered:** could have inlined the logic. chose to reuse.

#### 3. host context generation

```ts
// fillKeyrackKeys.ts:121, 132
hostContext = await genKeyrackHostContext({ owner: owner, prikey });
hostContext = await genKeyrackHostContext({ owner: owner, prikey: null });
```

**reuses:** genKeyrackHostContext() — the extant context generator that handles:
- prikey discovery
- host manifest load
- vault adapter initialization
- session identity setup

**alternatives considered:** could have built custom prikey discovery. the extant DAO already supports `prikey: null` for discovery mode. reused.

#### 4. vault inference

```ts
// fillKeyrackKeys.ts:153-156
const vaultInferred = inferKeyrackVaultFromKey({ keyName });
const vault = vaultInferred ?? 'os.secure';
const mechInferred = inferMechFromVault({ vault });
```

**reuses:**
- inferKeyrackVaultFromKey() — extant utility for key-based vault inference
- inferMechFromVault() — extant utility that maps vault to mechanism

#### 5. key operations (set, unlock, get)

```ts
// fillKeyrackKeys.ts:164-174
await setKeyrackKey({ key, env, org, vault, mech, repoManifest }, hostContext);

// fillKeyrackKeys.ts:189-195
await unlockKeyrackKeys({ env, key }, unlockContext);

// fillKeyrackKeys.ts:206-209
const attempt = await getKeyrackKeyGrant({ for: { key: slug } }, getContext);
```

**reuses:** all three extant operations:
- setKeyrackKey — the canonical set operation
- unlockKeyrackKeys — the canonical unlock operation
- getKeyrackKeyGrant — the canonical get operation

**alternatives considered:** could have called vault adapters directly. chose to use the higher-level operations that handle all edge cases.

### output pattern analysis

fillKeyrackKeys uses console.log with inline tree characters:

```ts
console.log(`🔐 keyrack fill (env: ${input.env}, ...)`);
console.log(`   ${ownerPrefix} for ${ownerLabel}`);
console.log(`   ${branchContinue}├─ set the key`);
```

**consistent with:** invokeKeyrack.ts (all keyrack subcommands)

searched for extant output utilities:
- `emitLine` — not found
- `printTree` — not found
- `outputTree` — not found

the extant pattern is inline console.log with tree characters. fillKeyrackKeys follows this pattern.

### patterns NOT found (no duplication)

| potential duplication | found? | notes |
|----------------------|--------|-------|
| custom prikey discovery | no | reused genKeyrackHostContext |
| custom manifest load | no | reused daoKeyrackRepoManifest |
| custom vault inference | no | reused inferKeyrackVaultFromKey |
| custom set/unlock/get | no | reused extant operations |
| custom output utilities | no | followed inline pattern |

## conclusion

fillKeyrackKeys is pure orchestration over extant mechanisms. no new utilities were created that duplicate extant functionality. all components reuse the canonical implementations.

the implementation follows the principle: "don't duplicate what you can delegate."
