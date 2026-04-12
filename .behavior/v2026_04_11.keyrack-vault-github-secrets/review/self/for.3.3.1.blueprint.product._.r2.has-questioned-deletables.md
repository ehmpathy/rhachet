# self-review: has-questioned-deletables (r2)

## feature traceability

### vaultAdapterGithubSecrets

**traces to:** vision usecases table — "set github app to gh secrets", "set any key to gh secrets", "delete key from gh secrets"

**can we delete?** no. this is the core deliverable.

---

### ghApiSetSecret, ghApiDelSecret, ghApiGetPublicKey

**traces to:** vision contract — set/del require gh api calls, set requires encryption via public key

**can we delete?** these could be inlined into the vault adapter. however:
- separate communicators match extant pattern (os.secure has separate encryption operations)
- each communicator can be tested in isolation
- ghApiGetPublicKey mirrors github api structure (separate endpoint)

**simplest version that works:** keep separate. matches extant decomposition. if we deleted and had to add back, we would add back as separate files.

---

### KeyrackHostVault union extension

**traces to:** vision contract — add `'github.secrets'` vault type

**can we delete?** no. required for type safety.

---

### KeyrackHostVaultAdapter get nullable

**traces to:** vision contract — "get: null makes write-only explicit at the interface level"

**can we delete?** no. this is the pit of success pattern for write-only vaults. explicit nullable forces every caller to handle the write-only case.

**alternative considered:** could use a different interface for write-only vaults. but this adds complexity. nullable `get` is simpler and reuses extant type.

---

### unlockKeyrackKeys update

**traces to:** vision edgecases — "unlock --key X → failfast", "unlock --for repo → skip silently"

**can we delete?** no. required for write-only vault handle.

---

### getKeyrackKeyHost update

**traces to:** vision usecases — "get key value → failfast"

**can we delete?** no. required for failfast dispatch.

---

### tweetnacl, tweetnacl-util dependencies

**traces to:** github secrets api requirement — values must be encrypted via sodium sealed box

**can we delete?** no. github api requires encrypted values. no simpler alternative exists.

**alternative considered:** could shell out to external tool. but npm package is simpler, more portable, and avoids external dependency.

---

## components that could be simplified

### could we inline ghApiGetPublicKey into ghApiSetSecret?

**answer:** the public key is needed only for encryption in set. inlined would work. however:
- separate file makes the two-step flow explicit (fetch key → encrypt → set)
- matches github api structure (separate endpoint)
- easier to test in isolation

**decision:** keep separate. clearer decomposition.

---

### could we inline communicators into vault adapter?

**answer:** yes, but:
- extant pattern separates communicators from adapters
- communicators can be tested without full adapter context
- clearer responsibility: adapter orchestrates, communicator does i/o

**decision:** keep separate. matches extant pattern.

---

## summary

| component | deletable? | rationale |
|-----------|------------|-----------|
| vaultAdapterGithubSecrets | no | core deliverable |
| ghApiSetSecret | no | required for set |
| ghApiDelSecret | no | required for del |
| ghApiGetPublicKey | no | required for encryption |
| KeyrackHostVault union | no | required for type safety |
| KeyrackHostVaultAdapter nullable get | no | pit of success for write-only |
| unlockKeyrackKeys update | no | required for unlock handle |
| getKeyrackKeyHost update | no | required for failfast |
| tweetnacl deps | no | github api requirement |

all components trace to vision requirements. none are superfluous.

