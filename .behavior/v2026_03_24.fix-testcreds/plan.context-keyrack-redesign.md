# plan: ContextKeyrack redesign

## goal

merge `ContextKeyrackHost` (DAO layer) and `KeyrackHostContext` (domain layer) into unified `ContextKeyrack` with lazy-cached identity discovery via `getOne`/`getAll` pattern:

```ts
ContextKeyrack {
  owner: string | null;
  identity: {
    getOne: (input: { for: 'manifest' }) => Promise<string | null>;  // lazy cached
    getAll: {
      discovered: () => Promise<string[]>;  // lazy cached
      prescribed: string[];
    };
  };
  hostManifest?: KeyrackHostManifest;
  repoManifest?: { org: string } | null;
  gitroot?: string | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
}
```

## why

1. **single context** — no separate DAO vs domain contexts
2. **lazy discovery** — don't scan ssh-agent/filesystem until needed
3. **cached** — discovery happens once per context, not per operation
4. **structured** — clear separation between prescribed (cli) and discovered (auto)
5. **getOne/getAll pattern** — consistent with domain operation verbs

---

## design

### withSimpleCache

use `withSimpleCache` from 'with-simple-cache' and `createCache` from 'simple-in-memory-cache':

```ts
import { createCache } from 'simple-in-memory-cache';
import { withSimpleCache } from 'with-simple-cache';

// getOne discovers on first call, then cached
const getOne = withSimpleCache(
  async (input: { for: 'manifest' }) => {
    // build pool from getAll
    const pool = [...prescribed, ...await discovered()];
    // trial decrypt, return identity
    return trialDecrypt(pool);
  },
  { cache: createCache() }
);

// getAll.discovered lazy cached
const discovered = withSimpleCache(
  async () => discoverIdentities(owner),
  { cache: createCache() }
);
```

### ContextKeyrack shape

```ts
import { withSimpleCache, createCache } from 'with-simple-cache';

export interface ContextKeyrack {
  owner: string | null;
  identity: {
    /**
     * .what = get identity for a purpose (e.g., manifest decryption)
     * .why = lazy discovery + trial decrypt on first call, then cached
     */
    getOne: (input: { for: 'manifest' }) => Promise<string | null>;
    getAll: {
      /**
       * .what = identities discovered from ssh-agent, ~/.ssh/$owner, etc.
       * .why = lazy discovery avoids filesystem/agent access until needed
       */
      discovered: () => Promise<string[]>;
      /**
       * .what = identities from cli --prikey flags
       * .why = explicit identities take precedence over discovered
       */
      prescribed: string[];
    };
  };
  hostManifest?: KeyrackHostManifest;
  repoManifest?: { org: string } | null;
  gitroot?: string | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
}
```

### factory function

```ts
/**
 * .what = generate context for keyrack operations
 * .why = creates unified context with lazy identity discovery and vault adapters
 */
export const genContextKeyrack = (input: {
  owner: string | null;
  prikeys?: string[];
  repoManifest?: { org: string } | null;
  gitroot?: string | null;
}): ContextKeyrack => {
  // getAll.discovered: lazy cached identity discovery
  const discovered = withSimpleCache(
    async () => discoverIdentities(input.owner),
    { cache: createCache() }
  );

  // getAll.prescribed: from cli --prikey flags
  const prescribed = input.prikeys ?? [];

  // getOne: lazy cached, calls getAll internally
  const getOne = withSimpleCache(
    async (args: { for: 'manifest' }) => {
      const pool = [...prescribed, ...await discovered()];
      return trialDecryptManifest({ owner: input.owner, pool });
    },
    { cache: createCache() }
  );

  return {
    owner: input.owner,
    identity: {
      getOne,
      getAll: { discovered, prescribed },
    },
    repoManifest: input.repoManifest,
    gitroot: input.gitroot,
    vaultAdapters: {
      'os.envvar': vaultAdapterOsEnvvar,
      'os.direct': vaultAdapterOsDirect,
      'os.secure': vaultAdapterOsSecure,
      'os.daemon': vaultAdapterOsDaemon,
      '1password': vaultAdapter1Password,
      'aws.iam.sso': vaultAdapterAwsIamSso,
    },
  };
};
```

---

## changes

### 1. src/domain.operations/keyrack/genContextKeyrack.ts (renamed from genKeyrackHostContext.ts)

```diff
- export interface KeyrackHostContext { ... }
- export const genKeyrackHostContext = async (input) => { ... }
+ export interface ContextKeyrack { ... }
+ export const genContextKeyrack = (input) => { ... }
```

- merge interface fields from both old types
- factory is sync (lazy getters, no async init)
- move vault adapter assembly into factory

### 2. src/access/daos/daoKeyrackHostManifest/index.ts

```diff
- export interface ContextKeyrackHost {
-   identity?: string;
- }
+ import { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
```

update `get()`:
- remove identity discovery logic (now in `context.identity.getOne`)
- call `await context.identity.getOne({ for: 'manifest' })` to get identity
- set `context.hostManifest = manifest`

### 3. callers of genKeyrackHostContext

rename imports and calls:
```diff
- import { genKeyrackHostContext } from './genKeyrackHostContext';
+ import { genContextKeyrack } from './genContextKeyrack';

- const context = await genKeyrackHostContext({ owner, prikeys });
+ const context = genContextKeyrack({ owner, prikeys });
+ await daoKeyrackHostManifest.get({ owner }, context);
```

### 4. delete genContextKeyrackGrantUnlock.ts

this file is now redundant:
- `ContextKeyrack` already has vault adapters
- callers use `genContextKeyrack()` directly
- identity accessed via `context.identity.getOne({ for: 'manifest' })`

### 5. tests

update integration tests to use `genContextKeyrack()` instead of `{ identity: x }`

---

## flow

```
caller creates context
    │
    ▼
genContextKeyrack({ owner, prikeys: ['~/.ssh/foo'] })
    │
    ├─ identity.getOne = withSimpleCache(→ trialDecrypt)  // not called yet
    ├─ identity.getAll.prescribed = ['~/.ssh/foo']
    ├─ identity.getAll.discovered = withSimpleCache(→ [...])  // not called yet
    └─ vaultAdapters = { os.envvar, os.direct, ... }
    │
    ▼
daoKeyrackHostManifest.get({ owner }, context)
    │
    ├─ await context.identity.getOne({ for: 'manifest' })  // first call triggers:
    │     ├─ getAll.discovered() triggers lazy discovery
    │     ├─ build pool: [...prescribed, ...discovered]
    │     ├─ trial decrypt with pool
    │     └─ return identity (cached for next call)
    ├─ context.hostManifest = manifest
    └─ return { manifest }
    │
    ▼
caller accesses await context.identity.getOne({ for: 'manifest' })  // returns cached identity
caller accesses context.hostManifest  // returns decrypted manifest
```

---

## questions

1. should `prikeys` be converted to identities eagerly in `prescribed`, or keep as paths and convert lazily?
   - **proposal**: keep as paths, convert to identities in `getOne` when pool is built
   - **reason**: prikey → identity conversion can fail (passphrase-protected), better to handle in one place

2. should `discovered` return paths or identities?
   - **proposal**: return paths, convert to identities in `getOne`
   - **reason**: consistent with prescribed; single conversion point
