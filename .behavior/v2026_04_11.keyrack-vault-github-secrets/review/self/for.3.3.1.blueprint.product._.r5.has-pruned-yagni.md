# self-review: has-pruned-yagni (r5)

## deeper reflection: what could be over-abstraction?

r4 traced every component to vision. but did I question hard enough?

---

### challenge: why three separate communicator files?

**the question:** ghApiSetSecret, ghApiDelSecret, ghApiGetPublicKey could be one file `ghApiSecrets.ts` with three exports.

**why it holds:** extant pattern in the codebase is one file per operation. check:
- `daoKeyrackHostManifest/` has separate get, set files
- vault adapters follow this pattern consistently

three files match the decomposition grain. one file would couple three distinct api calls.

**verdict:** not YAGNI. matches extant pattern.

---

### challenge: why tweetnacl over simpler approach?

**the question:** could we avoid the npm dependency?

**why it holds:** github secrets api requires libsodium sealed box encryption. the request body must include `encrypted_value` which is the secret encrypted with the repo's public key.

options:
1. `tweetnacl` — pure js, no native deps, well-maintained
2. `sodium-native` — native bind, faster but more complex install
3. shell out to `gh secret set` — but this is different api, not `gh api`
4. node crypto — does not support sealed box (nacl specific)

tweetnacl is the minimum viable dependency for sodium sealed box.

**verdict:** not YAGNI. required by github api.

---

### challenge: why validateSecretName as explicit step?

**the question:** the api would reject invalid names anyway. do we need pre-validation?

**why it holds:**
- failfast principle — catch errors early with clear messages
- github's error for invalid names is cryptic ("Resource not accessible")
- validation adds one check, saves debug time

**verdict:** not YAGNI. vision explicitly lists secret name validation as research item.

---

### challenge: why 10 acceptance test cases?

**the question:** could fewer cases cover the same behavior?

**why it holds:** each case maps to a distinct edgecase in vision:

| case | vision edgecase |
|------|-----------------|
| case1 | set via EPHEMERAL_VIA_GITHUB_APP |
| case2 | set via PERMANENT_VIA_REPLICA |
| case3 | get failfast |
| case4 | unlock --key failfast |
| case5 | unlock --for repo skip |
| case6 | status locked |
| case7 | del success |
| case8 | gh auth required |
| case9 | repo not found |
| case10 | permission denied |

to merge cases would hide distinct behaviors. wish says "verify the full stdout via snaps as usual" — each case has distinct stdout.

**verdict:** not YAGNI. each case covers vision edgecase.

---

### challenge: why separate integration tests per communicator?

**the question:** could one integration test file cover all three gh api calls?

**why it holds:** test coverage grain rule:
> communicators get integration tests

three communicators → three integration test files. this enables:
- isolated failure diagnosis
- parallel test execution
- clear ownership per file

one file would couple test failures across distinct api calls.

**verdict:** not YAGNI. matches test coverage grain.

---

### challenge: is mock gh cli over-specified?

**the question:** do we need three distinct mock patterns?

**why it holds:** each api endpoint has distinct behavior:
- public-key returns json with key_id and key
- PUT returns empty json
- DELETE returns empty json (idempotent)

the mock must return correct shapes for tests to pass.

**verdict:** not YAGNI. minimum viable mock.

---

## summary

every component was challenged. every component holds:

| component | challenge | why it holds |
|-----------|-----------|--------------|
| 3 communicator files | could be 1 file | matches extant pattern |
| tweetnacl dep | could avoid npm | github api requires sodium |
| validateSecretName | api rejects anyway | failfast principle |
| 10 test cases | could merge | each covers distinct edgecase |
| 3 integration tests | could merge | test coverage grain |
| mock gh cli | over-specified? | minimum viable for api shapes |

**conclusion:** no YAGNI found after deeper examination. blueprint is minimum viable for vision requirements.
