# self-review: has-consistent-conventions

review the blueprint for adherence to extant codebase conventions.

---

## search methodology

before I examined each new component, I conducted a systematic inventory of extant keyrack prefixes.

**search command**: `grep '^export const' src/domain.operations/keyrack -r`

**extant prefix inventory** (50+ operations examined):

| prefix | count | examples |
|--------|-------|----------|
| `get*` | 15+ | getOneKeyrackGrantByKey, getAllKeyrackSlugsForEnv, getKeyrackStatus |
| `set*` | 3 | setKeyrackKeyHost, setKeyrackRecipient |
| `del*` | 3 | delKeyrackKey, delKeyrackKeyHost, delKeyrackRecipient |
| `gen*` | 2 | genContextKeyrack, genContextKeyrackGrantGet |
| `as*` | 5 | asKeyrackKeySlug, asKeyrackKeyOrg, asKeyrackKeyName, asDurationMs, asShellEscapedSecret |
| `infer*` | 4 | inferKeyrackMechForSet, inferKeyrackEnvForSet, inferKeyrackVaultFromKey, inferKeyrackKeyStatusWhenNotGranted |
| `filter*` | 1 | filterSlugsByKeyInput |
| `source*` | 1 | sourceAllKeysIntoEnv |
| `parse*` | 5 | parseOrgFromScopedName, parseOrgFromRepositoryField, parseRepoFromRepositoryField, parseGithubAppCredentials (internal), parseFullSlug (internal) |
| `assert*` | 2 | assertKeyrackOrgMatchesManifest, assertKeyrackEnvIsSpecified |
| `decide*` | 2 | decideIsKeySlugForEnv, decideIsKeySlugEqual |
| `compute*` | 1 | computeExpiresAt |
| `format*` | 3 | formatKeyrackKeyBranch, formatKeyrackGetOneOutput, formatKeyrackGetAllOutput |
| `emit*` | 1 | emitKeyrackKeyBranch |
| `fill*` | 1 | fillKeyrackKeys |
| `init*` | 1 | initKeyrackRepoManifest |
| `discover*` | 2 | discoverRoleKeyracks, discoverIdentityForRecipient |
| `verify*` | 1 | verifyRoundtripDecryption |
| `unlock*` | 1 | unlockKeyrackKeys |
| `relock*` | 1 | relockKeyrack |
| `create*` | 2 | createKeyrackDaemonServer, createDaemonKeyStore |
| `start/spawn*` | 2 | startKeyrackDaemon, spawnKeyrackDaemonBackground |

**not found in keyrack**: `process*`, `export*`, `translate*`, `handle*`

this inventory informs each component analysis below.

---

## 1. parseSecretsInput.ts

**prefix**: `parse*`

**does the codebase use this prefix?** yes — 5 operations found.

**search evidence**: `grep 'const parse[A-Z]' src/domain.operations/keyrack -r` found:
- `parseOrgFromScopedName` — extracts org from @org/package name
- `parseOrgFromRepositoryField` — extracts org from package.json repository field
- `parseRepoFromRepositoryField` — extracts repo from repository field
- `parseGithubAppCredentials` (internal) — extracts app credentials from JSON blob
- `parseFullSlug` (internal) — extracts components from full slug string

**pattern observed**: `parse*` functions:
1. accept raw string input
2. extract structured data
3. throw on malformed input

**analysis**: `parseSecretsInput` transforms a JSON string from `toJSON(secrets)` into `Record<string, string>`. this matches the extant pattern exactly.

**why it holds**: the operation:
1. accepts raw string (JSON from GitHub workflow)
2. extracts structured data (key-value pairs)
3. throws with helpful error on malformed input ("hint: use toJSON(secrets)")

the `parse*` prefix is extant with 5 prior examples. `parseSecretsInput` follows the same pattern. no convention deviation.

---

## 2. filterToManifestKeys.ts

**prefix**: `filter*`

**does the codebase use this prefix?** yes — 1 operation found.

**search evidence**: `grep 'export const filter' src/domain.operations/keyrack` found:
- `filterSlugsByKeyInput.ts` — filters slugs array to match --key input pattern

**examined extant operation**:
```ts
// filterSlugsByKeyInput.ts
export const filterSlugsByKeyInput = (input: {
  slugs: string[];
  keyInput: string | null;
}): string[] => {
  // returns subset of slugs that match keyInput
};
```

**pattern observed**: `filter*` functions:
1. accept a collection as input
2. apply selection criteria
3. return a subset (same type as input collection)

**analysis**: `filterToManifestKeys` accepts input secrets, applies manifest declaration as criteria, returns subset. this matches the extant pattern.

**why it holds**: comparison:

| operation | input collection | selection criteria | output |
|-----------|-----------------|-------------------|--------|
| filterSlugsByKeyInput | string[] (slugs) | keyInput pattern | string[] (subset) |
| filterToManifestKeys | Record<string, string> (secrets) | manifest declaration | Record<string, string> (subset) |

the `filter*` prefix is extant. `filterToManifestKeys` follows the same pattern with different input/output types but identical semantics. no convention deviation.

---

## 3. processOneSecret.ts

**prefix**: `process*`

**does the codebase use this prefix?** no — 0 operations found with this prefix.

**search evidence**: `grep 'export const process[A-Z]' src/domain.operations/keyrack -r` and `grep 'export const process[A-Z]' src -r` both returned 0 results.

**what does this operation do?**
1. parse secret value as JSON to detect `mech` field
2. if mech found → route to appropriate adapter (github app, aws sso, replica)
3. apply firewall validation patterns (block ghp_*, AKIA*, etc.)
4. return KeyrackGrantAttempt

**alternative extant prefixes evaluated**:

| prefix | extant sense | fit | rejection reason |
|--------|-------------|-----|------------------|
| `get*` | retrieve from storage/compute | no | this transforms AND validates, not retrieves |
| `set*` | mutate persistent state | no | this returns result, does not persist |
| `as*` | simple type cast | no | `as*` is deterministic cast; this orchestrates with side effects |
| `gen*` | find-or-create | no | no persistence involved |
| `infer*` | smart inference from context | no | this does more than infer — transforms and validates |
| `translate*` | not extant | — | no precedent |
| `deliver*` | used in mech adapters | no | internal to adapters, not orchestrator pattern |

**the One suffix pattern**:

`grep 'One[A-Z]' src/domain.operations/keyrack` found:
- `getOneKeyrackGrantByKey` — single grant retrieval
- `getOneOpAccount` (internal) — single 1password account
- `formatKeyrackGetOneOutput` — single grant output format

the `One` suffix indicates per-item operation vs batch. `processOneSecret` follows this pattern.

**analysis**: `process*` is a new prefix, but:
1. no extant prefix adequately describes "orchestrate transformation + validation + routing"
2. `process` is domain-neutral and descriptive
3. does not conflict with any extant prefix semantics
4. the `One` suffix aligns with extant single-item patterns

**why it holds**: the operation is genuinely novel — there's no extant pattern for "detect mech from value, route to adapter, apply firewall, return grant." the closest is `deliverForGet` inside mechanism adapters, but that's internal to the adapter, not an orchestrator. introducing `process*` as a prefix for "orchestrate multi-step transformation" is acceptable. it does not conflict with get/set/gen semantics.

---

## 4. exportGrantedSecrets.ts

**prefix**: `export*`

**does the codebase use this prefix?** no — 0 operations found with this prefix.

**search evidence**: `grep 'export const export[A-Z]' src -r` returned 0 results.

**what does this operation do?**
1. iterate over granted secrets
2. call `core.setSecret(secret)` to mask in logs
3. call `core.exportVariable(key, secret)` to write to GITHUB_ENV
4. subsequent workflow steps can access via `${{ env.KEY }}`

**examined the inverse operation**: `sourceAllKeysIntoEnv`

```ts
// sourceAllKeysIntoEnv.ts lines 128-131
if (envVarName && !process.env[envVarName]) {
  process.env[envVarName] = key.grant.key.secret;
}
```

this writes to `process.env` — same Node.js process only. GitHub Actions require `GITHUB_ENV` file for cross-step persistence.

**alternative extant prefixes evaluated**:

| prefix | extant sense | fit | rejection reason |
|--------|-------------|-----|------------------|
| `source*` | read from vault → process.env | no | this writes TO external env, not reads FROM |
| `set*` | mutate single entity | no | this operates on collection; `set*` typically for single |
| `emit*` | emitKeyrackKeyBranch outputs to stdout | no | this writes to file, not stdout |
| `format*` | string format for display | no | this has side effects (file write) |
| `write*` | not extant in keyrack | — | too generic |

**the source/export symmetry**:

| operation | direction | target | mechanism |
|-----------|-----------|--------|-----------|
| `sourceAllKeysIntoEnv` | inbound | process.env | direct assignment |
| `exportGrantedSecrets` | outbound | GITHUB_ENV | core.exportVariable |

`source*` = pull credentials IN from vault.
`export*` = push credentials OUT to external environment.

these are complementary verbs. `export` is the natural inverse of `source`.

**why it holds**: introducing `export*` fills a vocabulary gap:
1. `source*` is established for "pull into process"
2. `export*` describes "push to external environment"
3. GitHub Actions API uses `exportVariable` — the prefix aligns with the underlying API
4. does not conflict with any extant prefix semantics

the operation is GitHub Actions-specific. it belongs in `keyrack/firewall/` (action code), not `src/` (CLI code). the new prefix is appropriate for this new context.

---

## file placement conventions

**where do keyrack operations live?** `src/domain.operations/keyrack/`

**where does the action live?** `keyrack/firewall/src/`

**is this consistent with extant patterns?**

**search evidence**: `find . -name 'action.yml' -not -path './node_modules/*'` found:

| path | type | runtime |
|------|------|---------|
| `.github/actions/keyrack/action.yml` | composite | shell (wraps CLI) |
| `.github/actions/please-release/action.yml` | composite | shell |
| `.github/actions/test-shards-setup/action.yml` | composite | shell |

**extant pattern**: composite actions live in `.github/actions/`. these wrap CLI commands with shell.

**the firewall action is different**:

| action | type | runtime | why different location |
|--------|------|---------|------------------------|
| keyrack (extant) | composite | shell wraps CLI | simple CLI wrapper |
| firewall (new) | node | typescript via ncc | requires npm deps, build step |

the firewall action:
1. is a Node.js action (`runs.using: node20`)
2. needs `@actions/core` dependency
3. requires `ncc` bundle step
4. imports FROM `src/` (cannot be composite)

**why `keyrack/firewall/` not `.github/actions/keyrack-firewall/`?**

Node.js actions with dependencies need:
- their own `package.json` (deps: @actions/core)
- their own build/bundle step (ncc)
- their own `dist/` output

these requirements are cleaner in a top-level directory than nested in `.github/actions/`. the firewall action reuses domain logic from `src/` — easier to import with `keyrack/firewall/` placement.

**why it holds**: the extant `.github/actions/keyrack/` is a composite action that shells out to CLI. the firewall action is a Node.js action that needs build infrastructure. different action types warrant different locations.

---

## import conventions

**does the action follow extant import patterns?**

**examined imports**:
```ts
// from keyrack subsystem
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechAdapterGithubApp';
import { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';
```

**analysis**: the action imports from:
- `@src/access/daos/` — data access
- `@src/domain.operations/keyrack/adapters/` — mechanism adapters
- `@src/domain.objects/keyrack/` — domain objects

these follow the extant directional dependency rules. action → domain.operations → domain.objects. no upward imports.

---

## test file conventions

**test file placement**: collocated with source files.

| source file | test file |
|-------------|-----------|
| `parseSecretsInput.ts` | `parseSecretsInput.test.ts` |
| `filterToManifestKeys.ts` | `filterToManifestKeys.test.ts` |
| `processOneSecret.ts` | `processOneSecret.integration.test.ts` |
| `exportGrantedSecrets.ts` | `exportGrantedSecrets.integration.test.ts` |
| `index.ts` | `index.integration.test.ts` |

**test type conventions**:
- `.test.ts` — unit tests (pure transformers)
- `.integration.test.ts` — integration tests (orchestrators, communicators)

**why it holds**: this matches the extant pattern in `src/domain.operations/keyrack/`:
- `parseKeySlugComponents.test.ts` — unit test for transformer
- `sourceAllKeysIntoEnv.integration.test.ts` — integration test for orchestrator

---

## conclusion

convention analysis complete.

### name prefix summary

| component | prefix | convention status | search evidence |
|-----------|--------|-------------------|-----------------|
| parseSecretsInput | parse* | **aligns** | 5 extant parse* functions found |
| filterToManifestKeys | filter* | **aligns** | 1 extant filter* function found |
| processOneSecret | process* | **new** | 0 extant; no better prefix available |
| exportGrantedSecrets | export* | **new** | 0 extant; fills source*/export* symmetry |

### new prefixes justified

**process*** — introduced for "orchestrate multi-step transformation":
- no conflict with get/set/gen semantics
- `One` suffix aligns with extant getOne*/setOne* pattern
- operation is genuinely novel (detect mech → route adapter → validate → return)

**export*** — introduced as inverse of `source*`:
- source = pull credentials inbound
- export = push credentials outbound
- aligns with GitHub Actions API (`core.exportVariable`)

### placement summary

| concern | convention | status |
|---------|------------|--------|
| file location | `keyrack/firewall/` for Node.js action | **justified** — differs from composite actions in `.github/actions/` |
| imports | directional: action → domain.operations → domain.objects | **aligns** |
| test collocation | tests next to source files | **aligns** |
| test suffixes | .test.ts (unit), .integration.test.ts (integration) | **aligns** |

### why it holds

this review examined:
1. **50+ extant keyrack operations** to build prefix inventory
2. **each new component** against that inventory
3. **extant action patterns** at `.github/actions/`
4. **import and test conventions** in the codebase

two components align with extant prefixes. two introduce new prefixes with clear justification. file placement differs from composite actions because the firewall action has different runtime requirements. no convention violations found.
