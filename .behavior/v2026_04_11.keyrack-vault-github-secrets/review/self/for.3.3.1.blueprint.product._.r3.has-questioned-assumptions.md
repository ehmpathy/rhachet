# self-review: has-questioned-assumptions (r3)

## hidden technical assumptions

### assumption 1: gh cli is available

**the assumption:** the blueprint assumes `gh` cli is installed and on PATH.

**what if the opposite were true?**
if gh is not installed, ghApiSetSecret/ghApiDelSecret/ghApiGetPublicKey would fail with "command not found".

**evidence:** the vision explicitly states "gh cli is available" as an assumption (line 190). this is acceptable — gh is the standard tool for github api access.

**mitigation in blueprint:** validateGhAuth checks if gh is authenticated. if gh is absent, this will fail with a clear error.

**verdict:** assumption is acceptable. documented in vision. fail-fast behavior is correct.

---

### assumption 2: tweetnacl is compatible with github's libsodium

**the assumption:** tweetnacl's sealed box implementation works with github's libsodium expectation.

**what if the opposite were true?**
github would reject the encrypted value with a cryptic error.

**evidence:** this is listed as an open item for research:
> **[research]** validate tweetnacl sealed box compatibility with github's libsodium expectation

**verdict:** assumption is not yet validated. the open item is appropriate. if research shows incompatibility, we escalate to wisher.

---

### assumption 3: exid format is unique

**the assumption:** `owner/repo.SECRET_NAME` uniquely identifies a github secret.

**what if multiple repos have the same name in different orgs?**
the format includes owner, so `ehmpathy/rhachet.KEY` vs `otherorg/rhachet.KEY` are distinct.

**what if the same key is set in multiple repos?**
the exid includes the repo, so each combination is unique.

**verdict:** the format is unique. owner/repo/secretname is a unique triple.

---

### assumption 4: github api uses PUT for upsert

**the assumption:** `gh api -X PUT /repos/{owner}/{repo}/actions/secrets/{name}` creates or updates.

**what if create and update are separate?**
github's rest api uses PUT for both. this is documented: "creates or updates a repository secret".

**evidence:** github api docs confirm PUT is idempotent upsert.

**verdict:** assumption is correct. github api uses PUT for upsert.

---

### assumption 5: nullable get is the right pattern

**the assumption:** `get: null` is better than throw in the get method.

**what if we used a different interface for write-only vaults?**
- option A: `get: null` (current) — forces compile-time check
- option B: `get: () => throw` — fails at runtime
- option C: separate WriteOnlyVaultAdapter interface — adds type complexity

**which is simplest?**
- option A is one type change
- option B hides the write-only nature
- option C requires new interface, type guards, etc.

**verdict:** nullable get is the simplest approach. pit of success via types.

---

### assumption 6: mech adapters work unchanged

**the assumption:** mechAdapterGithubApp returns a secret value that the vault adapter can push to github.

**what if the mech adapter needs modification?**
per the research: pattern.8 says "mech adapter already handles guided setup, no changes needed".

the mech adapter:
1. prompts user for org, app, pem path
2. constructs json blob with appId, installationId, privateKey
3. returns the json blob as the secret value

the vault adapter:
1. receives secret value from mech
2. encrypts with github public key
3. pushes to github api

**verdict:** the mech adapter outputs a string. the vault adapter encrypts and pushes that string. no couple issues.

---

### assumption 7: repo-level secrets only in v1

**the assumption:** v1 writes to repo-level secrets, not environment or org secrets.

**what if the user wants environment secrets?**
the vision explicitly scopes this out:
> **future enhancements (out of scope for v1)**
> 1. **github environment secrets**: env != 'all' could map to environment-scoped secrets

**verdict:** this is explicitly out of scope. the assumption is documented.

---

## summary

| assumption | validated? | action |
|------------|------------|--------|
| gh cli available | yes (vision) | fail-fast if absent |
| tweetnacl compatible | no (open item) | research before impl |
| exid unique | yes (format analysis) | format is sufficient |
| PUT for upsert | yes (github docs) | api confirmed |
| nullable get pattern | yes (simplest) | compile-time safety |
| mech adapters unchanged | yes (research) | no couple issues |
| repo-level secrets only | yes (vision scopes out) | v1 scope documented |

all assumptions are either validated or documented as open research items.

