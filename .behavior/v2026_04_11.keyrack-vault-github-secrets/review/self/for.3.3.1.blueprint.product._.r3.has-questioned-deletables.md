# self-review: has-questioned-deletables (r3)

## deeper reflection: what have i not questioned?

the r2 review covered each component. but let me push harder on *why* we need this at all.

---

## question: do we need a new vault adapter?

**could we reuse os.secure and just add github push logic?**

no. os.secure stores to local filesystem. github.secrets stores to remote api. the storage location is fundamentally different.

**could we make os.secure push to github as a secondary action?**

that would mix concerns:
- os.secure owns local file storage
- github push is a separate destination

adding github push to os.secure would violate single responsibility. the vault adapter pattern exists for this reason — different storage backends get different adapters.

**simplest version:** new vault adapter. this matches the architecture.

---

## question: do we need all three communicators?

**ghApiSetSecret** — required. this is the core "push to github" operation.

**ghApiDelSecret** — could we skip delete support?

checking vision: "delete key from gh secrets" is a usecase. the wisher wants this.

**ghApiGetPublicKey** — could we skip encryption?

no. github secrets api *requires* values to be encrypted with the repo's public key. this is not optional. source: github api docs.

**simplest version:** all three communicators. github api requires them.

---

## question: do we need tweetnacl?

**could we use a different encryption method?**

no. github secrets api specifies libsodium sealed box (nacl). tweetnacl is the standard js implementation.

**could we shell out to an external tool?**

technically yes, but:
- adds external dependency (must install sodium cli)
- more complex to test
- less portable

**simplest version:** tweetnacl npm package. pure js, no external deps.

---

## question: do we need nullable get on the interface?

**could we just throw in the adapter's get method?**

yes, but then:
- every caller must catch and handle
- the write-only nature is hidden in implementation
- new callers might not know to handle the throw

**nullable at interface level:**
- typescript enforces check at compile time
- write-only is explicit in the type
- callers cannot forget to handle

**simplest version:** nullable get. pit of success via types.

---

## question: do we need the unlock handling?

**could we skip unlock changes and let it fail naturally?**

checking vision: "unlock --key X → failfast" and "unlock --for repo → skip silently"

the wisher explicitly wants:
- specific key unlock to fail loud
- bulk unlock to continue workflow by skip

if we did none of this, bulk unlock would fail entirely when it hits a github.secrets key. that breaks the "don't break workflow" requirement.

**simplest version:** check for null get in unlock flow. required by vision.

---

## question: is the test coverage excessive?

the blueprint includes:
- integration tests for each communicator
- integration test for vault adapter
- integration test for getKeyrackKeyHost
- integration test for unlockKeyrackKeys
- acceptance test for full flow
- 10 acceptance test cases

**could we reduce test coverage?**

looking at the matrix (2.2.criteria.blackbox.matrix.yield.md):
- 5 matrices covering set, get, unlock, del, status
- each matrix has meaningful combinations

the test cases map to matrix combinations. removing tests would leave matrix cells uncovered.

**simplest version:** the blueprint coverage is necessary. each test covers a distinct scenario.

---

## found one potential simplification

**ghApiGetPublicKey could be inlined into ghApiSetSecret**

the public key is only needed for set. it's fetched, used for encryption, and discarded.

**should we inline?**

pros of inline:
- one less file
- simpler dependency graph

cons of inline:
- loses clear separation of github api calls
- harder to test encryption vs api call separately

**decision:** keep separate. the clarity outweighs the cost of one extra file. if we had to add it back, we would add it as separate.

---

## summary

after three rounds, every component traces to vision requirements. the architecture is minimal:
- one vault adapter (required)
- three communicators (github api requires all three)
- one npm dep (github api requires sodium encryption)
- type extension (required for type safety)
- unlock flow update (required by vision)

no component can be deleted without break vision requirements.

