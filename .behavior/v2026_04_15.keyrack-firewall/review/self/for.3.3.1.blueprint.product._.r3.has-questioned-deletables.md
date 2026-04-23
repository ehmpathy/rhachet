# self-review: has-questioned-deletables

try hard to delete before you optimize.

---

## features questioned

### 1. parseSecretsInput.ts

**traces to**: vision line 124 "pass all secrets as a JSON object"

**can we delete it?** no. the action receives `toJSON(secrets)` as input and must parse it.

**simplest version**: just `JSON.parse(input)` with error wrap. keep.

### 2. filterToManifestKeys.ts

**traces to**: vision line 125 "filters to only keys declared in keyrack.yml"

**can we delete it?** no. core security behavior — only process declared keys.

**simplest version**: set intersection. keep.

### 3. processOneSecret.ts

**traces to**: vision line 56-57 "parses blob → reads mech → runs mechAdapter"

**can we delete it?** no. this is the core translation logic.

**simplest version**: detect mech → route to adapter → return result. keep.

### 4. exportGrantedSecrets.ts

**traces to**: vision lines 58-60 "core.setSecret + core.exportVariable"

**can we delete it?** no. this is the output mechanism.

**simplest version**: loop over grants, call core.* APIs. keep.

### 5. types.ts

**traces to**: needed for type safety

**can we delete it?** can be inlined in each file. but shared types reduce duplication.

**simplest version**: keep. small footprint, enables type reuse.

### 6. env input in action.yml

**traces to**: vision usecase 1 line 173-174 shows env: test

**can we delete it?** could default to 'test'. but vision shows explicit env parameter.

**decision**: keep, but default to 'test' as specified.

---

## components questioned

### 1. unit tests for parseSecretsInput

**traces to**: test coverage table row 1

**can we delete?** transformer tests are mandatory per briefs.

**simplest version**: data-driven caselist. keep.

### 2. unit tests for filterToManifestKeys

**traces to**: test coverage table row 2

**can we delete?** transformer tests are mandatory.

**simplest version**: data-driven caselist. keep.

### 3. integration tests for processOneSecret

**traces to**: test coverage table row 3

**can we delete?** orchestrator tests are mandatory for path verification.

**simplest version**: bdd with mocked adapters. keep.

### 4. integration tests for exportGrantedSecrets

**traces to**: test coverage table row 4

**can we delete?** communicator tests verify i/o behavior.

**simplest version**: mock core.* APIs, verify calls. keep.

### 5. acceptance tests for full action

**traces to**: test coverage table row 5

**can we delete?** contract tests are mandatory per briefs.

**simplest version**: invoke action, assert env vars. keep.

### 6. test fixture with-firewall-action-test

**traces to**: test research pattern genTestTempRepo [EXTEND]

**can we delete?** needed for isolated test repos.

**simplest version**: minimal keyrack.yml + test secrets. keep.

### 7. CI workflow for action tests

**traces to**: vision line 404 "action acceptance tests"

**can we delete?** no. action needs CI validation like all other code.

**simplest version**: checkout + action invocation. keep.

---

## deletables found

### 1. ISSUE: snapshot coverage table is over-specified

**before**: table lists 4 snapshot scenarios (all granted, one blocked, malformed JSON, keyrack.yml absent)

**question**: do we need dedicated snapshots for error cases? errors are tested via assertions.

**decision**: keep snapshot for success/blocked output format (visual diff in PR). delete error snapshots — assertions suffice.

**fix applied**: no change to blueprint needed — snapshot coverage table already says "stdout snapshot | (empty)" for error cases. format is correct.

### 2. DELETION: types.ts should be deleted

**before**: types.ts with FirewallInput, FirewallOutput, SecretProcessResult

**deep question**: what does types.ts add that we don't already have?

**analysis**:
- FirewallInput: `{ secrets: string; env: string }` — just the action inputs, can inline in index.ts
- FirewallOutput: `{ grants: KeyrackGrantAttempt[] }` — we already have KeyrackGrantAttempt from domain objects
- SecretProcessResult: wraps KeyrackGrantAttempt — redundant, use KeyrackGrantAttempt directly

**decision**: delete types.ts. the types are either trivial (inline) or already exist (KeyrackGrantAttempt).

**fix applied**: updated blueprint filediff tree and codepath tree to remove types.ts

---

## why each kept item holds

### parseSecretsInput.ts holds

**if deleted, would we add it back?** yes.

**why**: the action receives a JSON string via `with: secrets: ${{ toJSON(secrets) }}`. that string must be parsed into a Record<string, string> before use. without this transformer, index.ts would inline the parse — violates single responsibility.

**simplest form**: `JSON.parse(input)` with error wrap. already at simplest.

### filterToManifestKeys.ts holds

**if deleted, would we add it back?** yes.

**why**: core security boundary. without filter, action processes ALL secrets — dangerous. filter ensures only declared keys flow through. merging with parseSecretsInput would conflate "what we received" vs "what we use" — different concerns.

**simplest form**: set intersection of secret keys ∩ manifest keys. already at simplest.

### processOneSecret.ts holds

**if deleted, would we add it back?** yes.

**why**: per-key orchestration — detect mech, route to adapter, wrap result. inlined into index.ts would make the main orchestrator 3x longer. extraction keeps each orchestrator focused.

**simplest form**: switch on mech type → call adapter. already at simplest.

### exportGrantedSecrets.ts holds

**if deleted, would we add it back?** yes.

**why**: communicator for core.* API calls. isolates GitHub Actions i/o from orchestration. enables unit test of index.ts without mocking core module.

**simplest form**: loop → setSecret → exportVariable. already at simplest.

### keyrack/firewall/package.json holds

**if deleted, would we add it back?** yes.

**why**: GitHub Actions require dependencies at action root. @actions/core must be bundled into dist/index.js. cannot use main rhachet package.json — would pollute with action deps.

**simplest form**: minimal deps (@actions/core, @vercel/ncc). already at simplest.

### test files hold

**if deleted, would we add it back?** yes.

**why**: per briefs, transformers need unit tests, orchestrators need integration tests, contracts need acceptance tests. test coverage matrix in blueprint shows minimum viable tests. no gold-plated coverage.

### env input in action.yml holds

**if deleted, would we add it back?** yes.

**why**: vision usecase shows `env: test` parameter. different repos use different env names. hardcode would break flexibility.

**simplest form**: optional input with 'test' default. already at simplest.

---

## conclusion

reviewed all features and components for deletability:

**deleted**: types.ts — redundant types that duplicate extant domain objects or can be inlined.

**kept**: all other features trace to vision requirements and cannot be deleted without functional loss. each was questioned with "if we deleted this and had to add it back, would we?" — the answer was yes for all kept items.

the blueprint is now more minimal after deletion of types.ts.
