# self-review: has-pruned-yagni

review for extras that were not prescribed. YAGNI = "you ain't gonna need it".

---

## components checked against vision

### 1. parseSecretsInput.ts

**was this explicitly requested?** yes. vision line 124 shows "pass all secrets as a JSON object" via `toJSON(secrets)`. parse is required.

**is this the minimum viable way?** yes. JSON.parse with error wrap is the simplest parse.

**alternative considered**: could inline JSON.parse in index.ts. rejected because error message for malformed JSON needs context. a separate transformer enables clear error with hint about toJSON format.

**why it holds**: the vision requires "pass all secrets as a JSON object". the action receives a string from toJSON(secrets). parse is necessary to get usable Record<string, string>. no parser library. no schema validation. no type coercion. just JSON.parse with helpful error message. this is the minimum viable parse.

### 2. filterToManifestKeys.ts

**was this explicitly requested?** yes. vision line 125 shows "filters to only keys declared in keyrack.yml".

**is this the minimum viable way?** yes. set intersection of input keys and manifest keys is the simplest filter.

**alternative considered**: could inline the filter logic in index.ts. rejected because the security boundary deserves explicit articulation. this is the gate that prevents undeclared keys from flow through.

**alternative considered**: could add advanced filter options (glob patterns, env-specific keys). rejected because the vision only mentions filter to declared keys. simple set intersection suffices.

**why it holds**: the vision requires "filters to only keys declared in keyrack.yml". this is a core security boundary — only process what the repo explicitly declares. the implementation is a single set intersection: `Object.keys(secrets).filter(k => manifestKeys.includes(k))`. no advanced pattern match. no env-specific logic beyond what the manifest provides. this is the minimum viable filter.

### 3. processOneSecret.ts

**was this explicitly requested?** yes. vision lines 56-57 describe "parses blob → reads mech → runs mechAdapter" flow.

**is this the minimum viable way?** yes. detect mech → route to adapter → return result is the minimal orchestration.

**alternative considered**: could add a plugin system for mechanism adapters. rejected because the vision specifies fixed mechanisms (EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO, PERMANENT_VIA_REPLICA). no need for user-extensible plugins.

**alternative considered**: could process secrets in parallel. rejected because fail-fast semantics require sequential process. parallel would continue after first error.

**why it holds**: the vision requires translate self-descriptive blobs to tokens. processOneSecret does exactly this: parse JSON → detect mech field → route to adapter → return grant result. no plugin registry. no parallel orchestration. no retry logic. this is the minimum viable orchestrator for the translation flow.

### 4. exportGrantedSecrets.ts

**was this explicitly requested?** yes. vision lines 58-60 show "core.setSecret + core.exportVariable" pattern for output.

**is this the minimum viable way?** yes. loop over grants, call core APIs is the simplest export.

**alternative considered**: could add output format options (JSON file, YAML file, etc). rejected because the vision only mentions $GITHUB_ENV output. env var export via core.exportVariable is the single requested output format.

**alternative considered**: could add selective export (only export some keys). rejected because the vision shows all granted keys should be exported. filter happens earlier at filterToManifestKeys.

**why it holds**: the vision requires export translated credentials to $GITHUB_ENV and mask in logs. exportGrantedSecrets does exactly this: for each grant, call core.setSecret (mask) then core.exportVariable (export). no file write. no selective export. no format options. this is the minimum viable output mechanism.

### 5. action.yml manifest

**was this explicitly requested?** yes. vision describes a GitHub Action. action.yml is required for any action.

**is this the minimum viable way?** yes. node20 runtime, secrets input, optional env input.

**the env input question**: vision usecase 1 line 173-174 shows `env: test` passed. the input is requested.

**alternative considered**: could add more inputs (verbose mode, fail-mode, output-format). rejected because vision shows only secrets and env inputs. additional inputs would be YAGNI.

**alternative considered**: could define outputs (grants list, blocked list). rejected because the primary output is $GITHUB_ENV which is a side effect, not an action output. the treestruct stdout is informational, not machine-readable output.

**why it holds**: the action.yml contains two inputs (secrets required, env optional with default) and no outputs. this matches exactly what the vision describes. no verbose flag. no output definitions. this is the minimum viable action manifest.

### 6. keyrack/firewall/package.json

**was this explicitly requested?** implicitly, yes. GitHub Actions need @actions/core bundled. cannot use main rhachet package.json.

**is this the minimum viable way?** yes. only @actions/core and @vercel/ncc. no extras.

**alternative considered**: could use main rhachet package.json. rejected because action deps would pollute rhachet deps, and action needs to bundle independently.

**alternative considered**: could add helper libraries (lodash, ramda, etc). rejected because the action logic is simple enough without utilities.

**why it holds**: the package.json contains exactly two deps: @actions/core (required for GitHub Actions APIs) and @vercel/ncc (required for bundle). no lodash. no axios. no test runners (tests live in main rhachet). this is the minimum viable package.json for a bundled action.

### 7. dist/index.js bundled output

**was this explicitly requested?** implicitly, yes. GitHub Actions require bundled code at action root.

**is this the minimum viable way?** yes. ncc creates minimal bundle.

**alternative considered**: could ship node_modules with action. rejected because this bloats the action directory and creates versioning complexity.

**alternative considered**: could use esbuild or webpack. rejected because ncc is the standard tool for GitHub Actions bundle and already proven in ehmpathy repos.

**why it holds**: dist/index.js is a single bundled file that contains all action code and deps. no source maps. no type declarations. no multiple entry points. this is the minimum viable bundle for a GitHub Action.

### 8. test files

**was this explicitly requested?** yes. vision line 404 mentions "action acceptance tests". briefs require test coverage.

**is this the minimum viable way?** the test tree in blueprint shows focused coverage:
- unit tests for transformers (parseSecretsInput, filterToManifestKeys)
- integration tests for orchestrators (processOneSecret, exportGrantedSecrets, index)
- acceptance tests for contract (full action flow)

**alternative considered**: could add property-based tests. rejected because the action logic is simple enough that example-based tests suffice.

**alternative considered**: could add performance tests. rejected because the action runs once per workflow, not in a hot path. performance is not a concern.

**why it holds**: the test coverage table in the blueprint shows exactly the cases needed to verify each grain: transformers get unit tests (pure functions), orchestrators get integration tests (compose calls), contract gets acceptance tests (full action flow). no fuzz tests. no load tests. no mutation tests. this is the minimum viable test coverage per grain requirements.

### 9. with-firewall-action-test fixture

**was this explicitly requested?** implicitly, yes. acceptance tests need fixtures. the vision line 404 mentions "action acceptance tests" which require test repos to invoke the action against.

**is this the minimum viable way?** yes. minimal keyrack.yml + test secrets for action scenarios.

**alternative considered**: could reuse extant test fixtures from keyrack subsystem. rejected because the action has different test scenarios (blocked keys, translation flow) that need dedicated fixtures.

**alternative considered**: could generate fixtures dynamically in tests. rejected because dynamic generation adds complexity and makes test scenarios harder to review. static fixtures are more readable.

**why it holds**: acceptance tests need a repo with `.agent/keyrack.yml` to invoke the action against. the fixture contains exactly what's needed: a keyrack.yml declaring test keys and test-secrets.json with various scenarios (safe keys, blocked keys, translatable blobs). no database. no external services. no complex setup. this is the minimum viable fixture for action acceptance tests.

### 10. .test-firewall-action.yml workflow

**was this explicitly requested?** yes. vision line 404 mentions "action acceptance tests" in CI. the action must be tested in its real environment (GitHub Actions runner).

**is this the minimum viable way?** yes. checkout + action invocation is minimal workflow.

**alternative considered**: could test action only via jest mocking core.* APIs. rejected because mocking cannot verify ncc bundle works, cannot verify node20 runtime compatibility, cannot verify GITHUB_ENV export works in real workflow.

**alternative considered**: could add matrix testing (multiple node versions, multiple runners). rejected because the vision specifies node20 only and all standard runners support node20. matrix adds CI time without verification value.

**why it holds**: the action must be tested in a real GitHub Actions environment to verify the bundle executes and env vars export correctly. the workflow does exactly this: checkout, invoke action with test secrets, verify env vars are set. no matrix. no complex job dependencies. no caching. this is the minimum viable CI workflow for action verification.

---

## YAGNI violations checked

### did we add abstraction "for future flexibility"?

**checked**: no abstraction layers beyond the four files:
- parseSecretsInput — single-purpose parse
- filterToManifestKeys — single-purpose filter
- processOneSecret — single-purpose orchestrator
- exportGrantedSecrets — single-purpose export

no base classes. no factory patterns. no plugin systems.

**verdict**: no YAGNI violation.

### did we add features "while we're here"?

**checked components**:
- no extra action inputs beyond secrets and env
- no extra action outputs beyond env var export
- no extra validation beyond firewall patterns
- no extra log output beyond treestruct format

**verdict**: no YAGNI violation.

### did we optimize before we knew it was needed?

**checked**:
- no cache layer
- no batch process
- no parallel process
- no lazy load

the blueprint processes secrets sequentially with fail-fast. this is the simplest correct approach.

**verdict**: no YAGNI violation.

---

## one deletion already applied

### types.ts was deleted in earlier review

**before**: blueprint included types.ts with FirewallInput, FirewallOutput, SecretProcessResult.

**YAGNI analysis**:
- FirewallInput = `{ secrets: string; env: string }` — just the action inputs, can inline in index.ts
- FirewallOutput = `{ grants: KeyrackGrantAttempt[] }` — we already have KeyrackGrantAttempt from domain objects
- SecretProcessResult — redundant wrapper around KeyrackGrantAttempt

**fix applied**: types.ts removed from filediff tree and codepath tree in earlier has-questioned-deletables review.

**why this was YAGNI**: the types were added "for future flexibility" but add no value. inline types and extant domain objects suffice.

---

## conclusion

all components in the blueprint trace to explicit vision requirements:

| component | vision reference | minimum viable? |
|-----------|-----------------|-----------------|
| parseSecretsInput.ts | line 124 (toJSON input) | yes |
| filterToManifestKeys.ts | line 125 (keyrack.yml filter) | yes |
| processOneSecret.ts | lines 56-57 (mech translation) | yes |
| exportGrantedSecrets.ts | lines 58-60 (core.* export) | yes |
| action.yml | action description | yes |
| package.json | action deps | yes |
| dist/index.js | action bundle | yes |
| test files | line 404 (acceptance tests) | yes |
| test fixture | acceptance test support | yes |
| CI workflow | line 404 (action tests in CI) | yes |

**YAGNI violations found**: none left. types.ts was already deleted in earlier review.

**abstractions added "for future"**: none.

**features added "while here"**: none.

**premature optimizations**: none.

the blueprint is minimal. every component traces to a vision requirement.
