# review.self: behavior-declaration-coverage (r5)

## the question

is every requirement from the vision, criteria, and blueprint implemented?

## deep investigation

reviewed potential discrepancy between criteria and implementation for os.daemon:

### apparent discrepancy

criteria says:
> "stores key in daemon memory only"
> "sothat(no disk persistence occurs)"

but setKeyrackKeyHost.ts:129 writes to host manifest for all vaults, os.daemon included.

### investigation

read setKeyrackKeyHost.ts to understand what is persisted:

```typescript
const keyHost = new KeyrackKeyHost({
  slug: input.slug,
  mech: input.mech,          // EPHEMERAL_VIA_SESSION
  vault: input.vault,        // os.daemon
  exid: exidForManifest,     // null for os.daemon
  env: input.env,            // e.g., 'prod'
  org: orgExpanded,          // e.g., 'ehmpathy'
  vaultRecipient: ...,
  maxDuration: ...,
  createdAt: ...,
  updatedAt: ...,
});

await daoKeyrackHostManifest.set({ upsert: manifestUpdated });
```

the host manifest entry contains:
- metadata: slug, env, org, timestamps
- config: which vault to use, which mech
- NO SECRET VALUE

the secret is stored via vaultAdapterOsDaemon.set():
```typescript
await daemonAccessUnlock({
  keys: [{ slug, key: { secret, grade }, source: { vault, mech }, ... }],
});
```

the secret goes to daemon memory via unix socket, never to disk.

### resolution

the criteria "no disk persistence" refers to the SECRET, not the CONFIG:

| what | persisted where | disk? |
|------|-----------------|-------|
| secret value | daemon memory | NO |
| vault config | host manifest | YES (metadata only) |

this is consistent with criteria:
> "sothat(no disk persistence occurs)"

the secret is not persisted to disk. the host manifest entry is config, not secret.

### why host manifest entry is needed

criteria also says:
```
given(host manifest has os.daemon entry)
  given(daemon was restarted and key is gone)
    when(user runs `keyrack unlock --key K --env E`)
      then(reports key as "absent")
```

this criterion REQUIRES host manifest entry to exist. without it, unlock cannot know the key was ever configured.

### conclusion on os.daemon

implementation is correct:
- secret stored in daemon memory only (ephemeral)
- host manifest stores config (which vault to use)
- unlock can find key because host manifest records os.daemon vault

no fix needed.

---

## full coverage check

### vision requirements

| requirement | implementation | status |
|-------------|----------------|--------|
| os.daemon: secret in daemon only | vaultAdapterOsDaemon.set() → daemonAccessUnlock() | ✓ |
| os.daemon: no secret disk write | secret never written to host manifest | ✓ |
| os.daemon: mech=EPHEMERAL_VIA_SESSION | inferMechFromVault.ts:31-33 | ✓ |
| os.daemon: 9h default expiry | vaultAdapterOsDaemon.ts:77 | ✓ |
| 1password: stores pointer not secret | vaultAdapter1Password.set() returns { exid } | ✓ |
| 1password: prompts for exid | vaultAdapter1Password.ts:124-127 | ✓ |
| 1password: validates roundtrip | vaultAdapter1Password.ts:139-155 | ✓ |
| 1password: mech=PERMANENT_VIA_REFERENCE | inferMechFromVault.ts:26-28 | ✓ |
| op cli check with exit 2 | vaultAdapter1Password.ts:93-120 | ✓ |

### criteria usecases

| usecase | requirements | status |
|---------|--------------|--------|
| 1: os.daemon set/get | prompts, stores in daemon, returns mech/vault | ✓ |
| 2: 1password set/unlock/get | prompts exid, validates, returns exid | ✓ |
| 3: ci with service accounts | OP_SERVICE_ACCOUNT_TOKEN via op cli | ✓ |
| 4: op cli not installed | exit 2 with instructions | ✓ |
| 5: op cli not authenticated | op surfaces error, hint provided | ✓ |
| 6: invalid exid | roundtrip fails, exit 2 | ✓ |

### blueprint phases

| phase | components | status |
|-------|------------|--------|
| 0 | directory restructure | ✓ all directories created |
| 1 | mech types | ✓ EPHEMERAL_VIA_SESSION, PERMANENT_VIA_REFERENCE |
| 2 | os.daemon adapter | ✓ exported, uses EPHEMERAL_VIA_SESSION |
| 3 | 1password adapter | ✓ exid prompt, isOpCliInstalled, roundtrip |
| 4 | tests | ✓ unit + integration for both adapters |
| 5 | acceptance | deferred to cli layer (per blueprint) |

---

## conclusion

after deep investigation of apparent discrepancy, confirmed implementation is correct:

- os.daemon secret is ephemeral (daemon memory only)
- host manifest stores config (not secret) — required for unlock flow
- all other vision/criteria/blueprint requirements implemented

no gaps found.
