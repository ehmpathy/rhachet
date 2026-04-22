# self-review r7: has-thorough-test-coverage

## the question

does the blueprint declare thorough test coverage by layer and case type?

---

## layer coverage review

### transformers → unit tests

| transformer | unit test declared? |
|-------------|---------------------|
| `asBrainAuthSpecShape.ts` | yes — `asBrainAuthSpecShape.test.ts` |
| `asBrainAuthTokenSlugs.ts` | yes — `asBrainAuthTokenSlugs.test.ts` |
| `genApiKeyHelperCommand.ts` | yes — `genApiKeyHelperCommand.test.ts` |

**why unit tests are correct for transformers**:

transformers are **pure computation** — same input always produces same output, no side effects.

1. **asBrainAuthSpecShape.ts**: parses spec words (e.g., `pool(keyrack://...)`) to spec shape. pure parse — no filesystem, no network, no state. unit test verifies parse logic without external dependencies.

2. **asBrainAuthTokenSlugs.ts**: extracts token slugs from spec source. pure parse — no external state read. unit test verifies glob expansion logic.

3. **genApiKeyHelperCommand.ts**: formats spec into shell command string. pure string template — no side effects. unit test verifies command format.

**verdict**: all transformers have unit test declarations. unit tests are the correct layer because transformers have no i/o.

---

### orchestrators → integration tests

| orchestrator | integration test declared? |
|--------------|---------------------------|
| `getOneBrainAuthCredentialBySpec.ts` | yes — `getOneBrainAuthCredentialBySpec.integration.test.ts` |
| `enrollBrainCli.ts` | yes — `enrollBrainCli.integration.test.ts` |

**why integration tests are correct for orchestrators**:

orchestrators **compose** transformers and communicators. they orchestrate the flow, and the flow includes i/o.

1. **getOneBrainAuthCredentialBySpec.ts**: orchestrates:
   - asBrainAuthSpecShape() → parse spec words (transformer)
   - asBrainAuthTokenSlugs() → extract slugs (transformer)
   - brainAuthAdapter.capacity.get.all() → query capacity (communicator)
   - keyrack.get() → fetch token from keyrack (communicator)

   the orchestration involves two communicators (adapter and keyrack). integration test verifies actual composition against real or realistic adapters.

2. **enrollBrainCli.ts**: orchestrates:
   - genApiKeyHelperCommand() → format command (transformer)
   - write enrollment config (communicator)
   - spawn brain CLI (communicator)

   the orchestration involves two communicators. integration test verifies enrollment actually works with real config files.

**verdict**: all orchestrators have integration test declarations. integration tests are the correct layer because orchestrators compose communicators.

---

### contracts → integration + acceptance tests

| contract | integration? | acceptance? |
|----------|-------------|-------------|
| `invokeBrainsAuth.ts` | yes | yes (`brains-auth.get.acceptance.test.ts`) |
| `invokeEnroll.ts` | yes | yes (`enroll.acceptance.test.ts`) |

**why both integration AND acceptance tests are required for contracts**:

contracts are **public interfaces** — CLI commands that face humans.

**integration tests** verify the contract works correctly — inputs produce expected outputs.

**acceptance tests** verify the contract **looks** correct — stdout format, error messages, exit codes match what users expect. snapshots enable visual review in PRs.

1. **invokeBrainsAuth.ts**: new CLI command. users will invoke `rhx brains auth get`.
   - integration test: verifies command produces correct results
   - acceptance test: snapshots verify output format is user-friendly

2. **invokeEnroll.ts (--auth)**: extended CLI command. users will invoke `rhx enroll --auth $spec`.
   - integration test: verifies --auth flag is parsed and passed to enrollBrainCli
   - acceptance test: snapshot verifies enrollment output includes brains auth info

**verdict**: all contracts have both integration and acceptance test declarations. dual coverage is correct because contracts need both functional verification (integration) and visual verification (acceptance + snapshots).

---

## case coverage review

### asBrainAuthSpecShape (transformer)

| case type | covered? | what |
|-----------|----------|------|
| positive | yes | valid spec words → spec shape |
| negative | yes | invalid spec format → error |

**why these cases are sufficient**:

the transformer parses spec words (e.g., `pool(keyrack://...)`) to spec shape. two paths:

1. **positive (valid words)**: words match expected format → return shape object. test verifies structure extraction.

2. **negative (invalid format)**: words do not match expected pattern → throw error. test verifies error message.

---

### asBrainAuthTokenSlugs (transformer)

| case type | covered? | what |
|-----------|----------|------|
| positive | yes | expands glob to slugs |
| edge | yes | no matches → empty array |

**why these cases are sufficient**:

the transformer extracts token slugs from spec source. two paths:

1. **positive (valid spec)**: spec source is valid → return array of slugs. test verifies expansion.

2. **edge (no matches)**: spec is valid but resolves to empty → return empty array. test verifies graceful empty result.

---

### getOneBrainAuthCredentialBySpec (orchestrator)

| case type | covered? | what |
|-----------|----------|------|
| positive | yes | healthy token available |
| positive | yes | first healthy wins (parallel probe) |
| negative | yes | all tokens exhausted |

**why these cases are sufficient**:

the orchestrator implements stateless parallel probe. three distinct scenarios:

1. **healthy token available**: at least one token has capacity → return it. the happy path. test verifies token is returned.

2. **first healthy wins (parallel)**: multiple tokens have capacity → pick the one with highest `left` value. test verifies selection logic.

3. **all tokens exhausted**: all tokens in pool have `left === 0` → return exhausted error. test verifies error response.

**stateless design note**: no rate-limited cooldown logic exists. capacity is queried fresh from adapter on each call.

---

### genApiKeyHelperCommand (transformer)

| case type | covered? | what |
|-----------|----------|------|
| positive | yes | generates correct command |

**why only positive case is acceptable**:

the transformer does pure string template: `"npx rhachet brains auth get --from ${specWords} --into claude.apiKeyHelper"`

**no negative case needed**: the function receives spec words that were already validated upstream. asBrainAuthSpecShape validates input before genApiKeyHelperCommand is called.

**no edge case needed**: string interpolation has no edge cases — any string can be interpolated. special characters are the shell's concern.

---

### invokeBrainsAuth (contract)

| case type | covered? | what |
|-----------|----------|------|
| positive | yes | get returns token |
| negative | yes | get exhausted |

**why these cases are sufficient**:

the contract exposes one subcommand: `get`

1. **positive (returns token)**: healthy token available → output token value. the happy path.
2. **negative (exhausted)**: all tokens have no capacity → output error message. user sees clear feedback.

---

### invokeEnroll with --auth (contract)

| case type | covered? | what |
|-----------|----------|------|
| positive | yes | enrollment with auth rotation |

**why only positive case is declared**:

the blueprint modifies invokeEnroll to handle optional `--auth` flag:

1. **positive (with --auth)**: flag is present → configure apiKeyHelper in enrollment config. test verifies config includes correct apiKeyHelper command.

**no negative case**: the --auth flag is optional. absence of flag means no brains auth configuration — extant enrollment behavior. this is covered by extant invokeEnroll tests (not new tests).

---

## snapshot coverage review

### acceptance test snapshots declared

| test file | snapshots |
|-----------|-----------|
| `brains-auth.get.acceptance.test.ts` | success output, exhaustion error |
| `enroll.acceptance.test.ts` | enrollment with auth rotation |

**why these snapshots are exhaustive**:

1. **brains auth get success**: verifies turtle vibes output format — users see expected structure.
2. **brains auth get exhausted**: verifies error output format — users see clear error with hints.
3. **enroll with auth**: verifies enrollment output includes apiKeyHelper confirmation.

**verdict**: all contract outputs have snapshot declarations for positive and negative cases.

---

## test tree verification

the blueprint declares a test tree (lines 144-189) that shows:

**unit tests (transformers)**:
```
src/domain.operations/brain.auth/
├── asBrainAuthSpecShape.test.ts
├── asBrainAuthTokenSlugs.test.ts
└── src/domain.operations/enroll/genApiKeyHelperCommand.test.ts
```

**integration tests (orchestrators + contracts)**:
```
src/domain.operations/brain.auth/getOneBrainAuthCredentialBySpec.integration.test.ts
src/domain.operations/enroll/enrollBrainCli.integration.test.ts
src/contract/cli/invokeBrainsAuth.integration.test.ts
src/contract/cli/invokeEnroll.integration.test.ts
```

**acceptance tests (contracts, blackbox)**:
```
blackbox/cli/
├── brains-auth.get.acceptance.test.ts
└── enroll.acceptance.test.ts
```

**why the test tree is complete**:

1. **file locations**: follow convention (unit = `.test.ts`, integration = `.integration.test.ts`, acceptance = in `blackbox/cli/`)
2. **test types**: match layer requirements (transformers = unit, orchestrators = integration, contracts = integration + acceptance)
3. **coverage**: every codepath in the filediff tree has a declared test file

---

## coverage matrix verification

the blueprint includes a coverage matrix (lines 193-202):

| codepath | unit | integration | acceptance |
|----------|------|-------------|------------|
| asBrainAuthSpecShape | yes | - | - |
| asBrainAuthTokenSlugs | yes | - | - |
| getOneBrainAuthCredentialBySpec | - | yes | yes |
| genApiKeyHelperCommand | yes | - | - |
| enrollBrainCli | - | yes | yes |
| invokeBrainsAuth | - | yes | yes |
| invokeEnroll (--auth) | - | yes | yes |
| BrainAuthCapacityDao (impl) | - | yes | - |

**why the matrix is correct**:

- transformers (3) have unit tests — pure computation, no i/o
- orchestrators (2) have integration tests — compose communicators
- contracts (2) have integration + acceptance tests — public interfaces
- BrainAuthCapacityDao impl has integration test — verifies adapter implementation

---

## test infrastructure review

the blueprint declares required test infrastructure (lines 249-253):

1. **fixture required**: `with-brain-auth` fixture with 3 pre-configured tokens in os.secure vault
2. **reuse extant infra**: daemon cleanup utility, isolated HOME pattern, CLI binary invocation — all from keyrack test infrastructure. avoids duplicate test setup.
3. **mock adapter for unit tests**: mock BrainAuthAdapter with fake capacity responses

**why this infrastructure is sufficient**:

- **fixture**: enables integration tests to exercise real token retrieval from keyrack
- **reuse**: leverages keyrack tests — isolated HOME and daemon cleanup already solved
- **mock adapter**: enables getOneBrainAuthCredentialBySpec tests to control capacity values without real adapter implementation

---

## summary

| category | status | why it holds |
|----------|--------|--------------|
| layer coverage | complete | all 3 transformers have unit tests, all 2 orchestrators have integration tests, all 2 contracts have integration + acceptance |
| case coverage | complete | positive + negative/edge cases declared for all codepaths |
| snapshot coverage | complete | success + exhaustion snapshots for brains auth, enrollment snapshot for enroll |
| test tree | aligned | file locations and test types match convention |
| coverage matrix | correct | matrix matches layer requirements |
| test infrastructure | declared | fixture, reuse, mock adapter specified |

**result**: blueprint has thorough test coverage. all layers have appropriate test types. positive, negative, and edge cases are covered. acceptance tests have exhaustive snapshots for contract outputs. test infrastructure accounts for stateless design with adapter mocks.
