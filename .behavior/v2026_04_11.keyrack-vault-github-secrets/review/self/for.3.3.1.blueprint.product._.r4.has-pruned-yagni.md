# self-review: has-pruned-yagni (r4)

## yagni check: was each component explicitly requested?

verification of each blueprint component against vision and wish.

---

### vaultAdapterGithubSecrets

**requested?** yes. vision usecases table line 61-67:
- `rhx keyrack set --key X --vault github.secrets`
- `rhx keyrack del --key X --vault github.secrets`
- `rhx keyrack status --key X`
- `rhx keyrack get --key X`

**minimum viable?** yes. one vault adapter implements all usecases.

---

### ghApiSetSecret, ghApiDelSecret, ghApiGetPublicKey

**requested?** yes. vision line 114 and edgecases table require gh api calls.

**minimum viable?** yes. three communicators for three api operations:
- set requires public key (for encryption) + PUT
- del requires DELETE
- separate files match extant pattern

---

### KeyrackHostVault union extension

**requested?** yes. vision line 69-79 specifies `--vault github.secrets` must work.

**minimum viable?** yes. one line change to add 'github.secrets' to union.

---

### KeyrackHostVaultAdapter nullable get

**requested?** yes. vision line 76 and 81:
> `get: null` makes write-only explicit at the interface level

**minimum viable?** yes. one type change enables compile-time safety.

---

### unlockKeyrackKeys changes

**requested?** yes. vision edgecases lines 178-179:
> `unlock --key X` → failfast: "github.secrets cannot be unlocked"
> `unlock --for repo` → skip silently (don't break workflow)

**minimum viable?** yes. two conditionals handle both cases.

---

### getKeyrackKeyHost changes

**requested?** yes. vision usecase line 67:
> get key value → failfast: "github secrets cannot be retrieved"

**minimum viable?** yes. one check for adapter.get === null.

---

### tweetnacl and tweetnacl-util

**requested?** implicitly yes. vision line 190:
> gh cli is available: the vault adapter uses `gh api` to set secrets

github api requires sodium sealed box encryption. tweetnacl is the standard npm library for this.

**minimum viable?** yes. pure js implementation with no external deps.

---

### validateSecretName

**requested?** yes. vision line 206:
> [research] secret name validation: github has restrictions on secret names

github rejects invalid names (must be alphanumeric/underscore, no GITHUB_* prefix).

**minimum viable?** yes. one validation before api call.

---

### test coverage (integration + acceptance)

**requested?** yes. wish explicitly states:
> ensure to mock the gh api correctly when you write tests against these
> and verify the full stdout via snaps as usual

**minimum viable?** yes. matches extant test coverage grain pattern:
- communicators get integration tests
- cli gets acceptance tests with snapshots

---

### mock gh cli extensions

**requested?** yes. wish explicitly states:
> ensure to mock the gh api correctly

**minimum viable?** yes. three case patterns for secrets api.

---

## yagni candidates: things that could be premature abstraction

### separate communicator files?

could inline ghApiSetSecret/ghApiDelSecret/ghApiGetPublicKey into vault adapter.

**verdict:** keep separate. matches extant pattern. easier to test in isolation.

### encryptSecretValue as separate function?

could inline into ghApiSetSecret.

**verdict:** keep as local helper within ghApiSetSecret. not a separate file. matches blueprint.

### 10 acceptance test cases?

could reduce to fewer cases.

**verdict:** no. each case covers a distinct user scenario from vision edgecases table.

---

## summary

| component | requested? | minimum viable? |
|-----------|------------|-----------------|
| vaultAdapterGithubSecrets | yes (vision usecases) | yes |
| ghApiSetSecret | yes (vision edgecases) | yes |
| ghApiDelSecret | yes (vision usecases) | yes |
| ghApiGetPublicKey | yes (github api requires) | yes |
| KeyrackHostVault union | yes (vision contract) | yes |
| nullable get interface | yes (vision line 76) | yes |
| unlockKeyrackKeys changes | yes (vision edgecases) | yes |
| getKeyrackKeyHost changes | yes (vision usecase) | yes |
| tweetnacl deps | yes (github api requires) | yes |
| validateSecretName | yes (vision research) | yes |
| integration tests | yes (wish) | yes |
| acceptance tests | yes (wish) | yes |
| mock gh cli | yes (wish) | yes |

**no YAGNI found.** every component traces to explicit vision/wish requirements.
