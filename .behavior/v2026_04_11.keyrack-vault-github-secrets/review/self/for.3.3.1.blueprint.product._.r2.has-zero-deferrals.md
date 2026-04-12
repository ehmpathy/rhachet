# self-review: has-zero-deferrals (r2)

## deeper reflection

### why it holds: no vision requirements deferred

the review in r1 confirmed all vision requirements are traced to blueprint. let me articulate *why* each holds.

---

### set operations — why complete

the vision requires:
- set github app to gh secrets via EPHEMERAL_VIA_GITHUB_APP
- set any key to gh secrets via PERMANENT_VIA_REPLICA

the blueprint covers both via `vaultAdapterGithubSecrets.set` with:
- `mechs.supported` includes both mechanisms
- `mech.acquireForSet` reuses extant mech adapter
- `ghApiSetSecret` + `ghApiGetPublicKey` for api calls

**why it holds:** the vault adapter declares both mechs as supported. the set flow delegates to the extant mech adapter for acquisition, then routes to github api. no new mech logic needed — the blueprint reuses extant decomposition.

---

### get is null — why complete

the vision requires:
- get key value → failfast: "github secrets cannot be retrieved"

the blueprint covers via:
- `KeyrackHostVaultAdapter.get` changed to nullable type
- `vaultAdapterGithubSecrets.get = null`
- `getKeyrackKeyHost` checks if `adapter.get is null` and failfasts

**why it holds:** write-only is explicit at the interface level. the nullable type forces every caller to check. failfast happens at dispatch, not deep in the stack. this is the pit of success pattern.

---

### unlock handle — why complete

the vision requires:
- unlock --key X specifically → failfast: "github.secrets cannot be unlocked"
- unlock --for repo with github.secrets keys → skip silently

the blueprint covers via:
- `unlockKeyrackKeys` checks if `adapter.get is null`
- if `--key X` specifically → failfast
- if bulk `--for repo` → add to omitted with reason 'remote'

**why it holds:** the logic branches on unlock mode (specific vs bulk). bulk unlock continues workflow by skip; specific unlock fails loud. this matches the vision's "don't break workflow" requirement for bulk operations.

---

### delete — why complete

the vision requires:
- delete key from gh secrets via gh api DELETE

the blueprint covers via:
- `ghApiDelSecret` communicator with `invokeGhApi (gh api -X DELETE)`
- adapter.del calls ghApiDelSecret
- host manifest entry removed after api success

**why it holds:** delete is idempotent by design (github api returns success for absent key). the blueprint follows extant del pattern from other vault adapters.

---

### status — why complete

the vision requires:
- status shows `locked` with `fix: null`

the blueprint covers via:
- `getKeyrackKeyHost` returns status metadata
- for github.secrets: `status: 'locked'`, `fix: null`

**why it holds:** `locked` reuses extant semantics. `fix: null` signals no unlock is possible. this matches the vision's proposed resolution for "status: locked is semantically overloaded" concern.

---

### error cases — why complete

the vision requires error handling for:
- gh auth not configured → failfast
- repo not found → failfast
- permission denied → failfast

the blueprint covers via:
- `validateGhAuth` in each communicator
- mock gh CLI with 404/403 responses for tests
- acceptance tests for each error path with snapshot verification

**why it holds:** each communicator starts with auth validation. error responses from gh api are parsed and surfaced. acceptance tests verify the stdout format matches snapshots.

---

### the open items — why they are not deferrals

the blueprint lists:
1. **[research]** confirm exact `gh api` syntax for secrets api
2. **[research]** validate tweetnacl sealed box compatibility with github's libsodium expectation

**why these are not deferrals:**
- these are implementation verification tasks, not scope reduction
- the vision requirement is "push to github secrets"
- the blueprint commits to that requirement
- the research items verify *how* to implement, not *whether* to implement
- if research reveals blockers, we escalate to wisher — not defer silently

---

## articulation complete

no vision requirements are deferred. each requirement is traced to specific blueprint sections. the "open items" are implementation research, not scope deferrals. the blueprint commits to deliver the full vision.

