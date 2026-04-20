# self-review: has-consistent-mechanisms

review for new mechanisms that duplicate extant functionality.

---

## search methodology

before I examined each new component, I conducted systematic searches for extant patterns:

| search | command | results |
|--------|---------|---------|
| JSON.parse patterns | `grep 'JSON\.parse' src/domain.operations/keyrack` | 14 files — scattered, no shared utility |
| sourceAllKeysIntoEnv | `grep 'sourceAllKeysIntoEnv' src/` | 2 files — implementation + SDK export |
| process.env writes | `grep 'process\.env\[' src/domain.operations/keyrack` | 16 files — various test/runtime uses |
| deliverForGet adapters | `grep 'deliverForGet' adapters/mechanisms` | 4 files — mech adapters |
| mech detection | `grep 'mech.*JSON\|detectMech' keyrack/` | 0 files — no extant pattern |
| manifest filter | `grep -i 'filter.*manifest' keyrack/` | 1 file — getAllKeyrackSlugsForEnv |

these searches inform each component analysis below.

---

## new mechanisms examined

the blueprint introduces four new components in `keyrack/firewall/src/`:

1. parseSecretsInput.ts
2. filterToManifestKeys.ts
3. processOneSecret.ts
4. exportGrantedSecrets.ts

for each, I verify whether it duplicates extant functionality.

---

## 1. parseSecretsInput.ts

**what it does**: parses JSON string from `toJSON(secrets)` action input into Record<string, string>.

**does the codebase have this?** no.

**search evidence**: `grep 'JSON\.parse' src/domain.operations/keyrack` found 14 files with JSON.parse calls, but each is inline and context-specific:
- `sourceAllKeysIntoEnv.ts:87` — parses `keyrack get --json` output
- `mechAdapterGithubApp.ts` — parses github app credential blobs
- various test files — parse test fixtures

no shared "parse JSON with error wrap" utility exists.

**analysis**: the keyrack subsystem has JSON parse calls scattered across files, but none handle the specific contract of action input (a stringified JSON object from GitHub's toJSON function). this is a new entry point, not a duplicate.

**alternatives considered**:
- extract a generic `safeJsonParse` utility: rejected because parseSecretsInput needs action-specific error message ("hint: use toJSON(secrets)"). generic utility would lose this context.
- reuse mechAdapterGithubApp's JSON parse: rejected because that parses credential blobs, not secrets maps.

**why it holds**: the action receives input as a string from GitHub workflow YAML. the CLI receives input via process.env. these are different entry points with different parse requirements. parseSecretsInput is action-specific because its error message must guide users to the correct toJSON(secrets) syntax.

---

## 2. filterToManifestKeys.ts

**what it does**: filters secrets to keys declared in keyrack.yml.

**does the codebase have this?** partially — it reuses daoKeyrackRepoManifest to read the manifest.

**search evidence**: `grep -i 'filter.*manifest' src/domain.operations/keyrack` found one file:
- `getAllKeyrackSlugsForEnv.ts` — filters manifest keys BY ENV, not by input secrets

I examined `getAllKeyrackSlugsForEnv.ts`:
```ts
// filter to slugs where spec.env matches the requested env
return Object.entries(input.manifest.keys)
  .filter(([, spec]) => spec.env === input.env)
  .map(([slug]) => slug);
```

this filters **manifest keys by env**. filterToManifestKeys filters **input secrets by manifest declaration**. these are complementary operations:

| function | input | filter by | output |
|----------|-------|-----------|--------|
| getAllKeyrackSlugsForEnv | manifest, env | env | slugs for that env |
| filterToManifestKeys | secrets, manifest | manifest declaration | secrets in manifest |

**analysis**:
- daoKeyrackRepoManifest is reused (marked `[REUSE]` in codepath tree)
- the filter logic (set intersection) is new but trivial (one line: `Object.keys(secrets).filter(k => manifestKeys.includes(k))`)
- getAllKeyrackSlugsForEnv serves a different purpose — it does not duplicate

**alternatives considered**:
- extend getAllKeyrackSlugsForEnv to also filter input secrets: rejected because that would complect two distinct operations. the function name says "get slugs for env", not "filter secrets".
- inline the filter in index.ts: rejected because this is a security boundary that deserves explicit articulation.

**why it holds**: the action needs to filter BEFORE translation, not at source time. extant patterns filter AT source time. getAllKeyrackSlugsForEnv filters by env, not by input presence. this is a different workflow step with a different filter axis.

---

## 3. processOneSecret.ts

**what it does**: detects mech field in secret value, routes to mech adapter, validates via firewall patterns.

**does the codebase have this?** partially — it reuses mechanism adapters.

**search evidence**:

`grep 'mech.*JSON\|detectMech' src/domain.operations/keyrack` found 0 files — no extant mech detection pattern.

`grep 'deliverForGet' adapters/mechanisms` found 4 files:
- `mechAdapterReplica.ts` — deliverForGet for permanent replica
- `mechAdapterGithubApp.ts` — deliverForGet for github app
- `mechAdapterAwsSso.ts` — deliverForGet for aws sso
- `mechAdapterReplica.test.ts` — tests

the adapters exist and have `deliverForGet`. what's new is **detection of mech from secret value** (self-descriptive blob pattern).

**how extant code determines mech**: I examined the unlock flow — it reads mech from **host manifest**:
```
host_manifest.keys[slug].mech → determines which adapter to use
```

**how action determines mech**: the action reads mech from **secret value**:
```
JSON.parse(secretValue).mech → determines which adapter to use
```

this is the self-descriptive blob pattern from the vision.

**analysis**:
- mechAdapterGithubApp.deliverForGet is reused (marked `[REUSE]`)
- mechAdapterAwsSso.deliverForGet is reused (marked `[REUSE]`)
- mechAdapterReplica.deliverForGet is reused (marked `[REUSE]`)
- the mech detection logic (JSON parse → extract mech field) is new
- the orchestration (detect → route → validate) is new

**alternatives considered**:
- add a shared `detectMechFromValue` utility: acceptable but not necessary for v1. if we add more entry points that need self-descriptive blobs, we could extract. for now, one caller doesn't warrant abstraction.
- reuse unlock orchestration: rejected because unlock reads mech from host manifest, not from secret value.

**why it holds**: the vision specifies self-descriptive blobs — the mech is embedded in the JSON, not declared in a host manifest. this is the fundamental difference between action flow and CLI flow. the adapters are reused; only the detection and orchestration are new. the new orchestration is intentionally different because it serves a different input source.

---

## 4. exportGrantedSecrets.ts

**what it does**: exports granted secrets to GITHUB_ENV via core.setSecret and core.exportVariable.

**does the codebase have this?** no direct equivalent.

**search evidence**: `grep 'sourceAllKeysIntoEnv' src/` found 2 files. I examined the implementation:

```ts
// sourceAllKeysIntoEnv.ts:128-129
if (envVarName && !process.env[envVarName]) {
  process.env[envVarName] = key.grant.key.secret;
}
```

this writes to `process.env` directly. works for the current Node process. does NOT persist to subsequent workflow steps.

**GitHub Actions env var persistence**:
- `process.env[k] = v` — affects current process only
- `core.exportVariable(k, v)` — writes to `$GITHUB_ENV` file, persists to subsequent steps

the action needs cross-step persistence. sourceAllKeysIntoEnv does not provide this.

**analysis**:
- the blueprint research cites `sourceAllKeysIntoEnv` with [EXTEND] marker
- sourceAllKeysIntoEnv writes to process.env directly (line 129)
- exportGrantedSecrets uses @actions/core APIs for GITHUB_ENV
- additionally, exportGrantedSecrets calls `core.setSecret()` to mask in logs — sourceAllKeysIntoEnv does not mask

**alternatives considered**:
- modify sourceAllKeysIntoEnv to support GITHUB_ENV: rejected because that would add @actions/core dependency to CLI code and branch on runtime detection. unnecessary complection.
- extract shared logic for iterating grants: the iteration is trivial (for-of loop). no value in abstraction.

**why it holds**: core.exportVariable writes to GITHUB_ENV file, not process.env. core.setSecret masks values in logs. these are GitHub Actions-specific APIs that do not belong in the CLI codebase. sourceAllKeysIntoEnv cannot be reused because it targets a different runtime (Node process vs GitHub Action step) and lacks log mask behavior.

---

## mechanisms that ARE reused

the blueprint correctly identifies and reuses extant mechanisms:

| mechanism | marked | usage | evidence |
|-----------|--------|-------|----------|
| daoKeyrackRepoManifest | [REUSE] | read keyrack.yml | filterToManifestKeys calls `.get({ gitroot })` |
| mechAdapterGithubApp | [REUSE] | translate github app blobs | processOneSecret calls `.deliverForGet()` |
| mechAdapterAwsSso | [REUSE] | translate aws sso profiles | processOneSecret calls `.deliverForGet()` |
| mechAdapterReplica | [EXTEND] | validate + ghs_* fix | processOneSecret calls `.deliverForGet()` + `.validate()` |
| KeyrackGrantAttempt | [REUSE] | output structure | all components return this shape |
| KeyrackGrantMechanism | [REUSE] | mech type enum | processOneSecret uses for routing |

**verification of reuse**: I verified each mechanism is called with its extant signature:
- `daoKeyrackRepoManifest.get({ gitroot })` — same signature as CLI callers
- `mechAdapter*.deliverForGet({ source })` — same signature as unlock flow
- `KeyrackGrantAttempt` shape — same as `keyrack get --json` output

**why it holds**: the research phase (3.1.3.research.internal.product.code.prod) identified these as reusable. the blueprint honors those results. each reused mechanism is called with its extant signature, not with modifications.

---

## potential duplication examined but rejected

### could parseSecretsInput use extant JSON parse utility?

**searched**: JSON.parse wrappers in codebase.

**found**: various files use JSON.parse directly. no shared "parse with error wrap" utility exists.

**decision**: a shared utility is not warranted. parseSecretsInput has action-specific error message ("hint: use toJSON(secrets)"). this context would be lost in a generic utility.

### could filterToManifestKeys merge with sourceAllKeysIntoEnv?

**searched**: sourceAllKeysIntoEnv implementation.

**found**: sourceAllKeysIntoEnv does filter + unlock + source in one pass. filterToManifestKeys is just filter.

**decision**: these serve different purposes. a merge would complect the action flow with unnecessary unlock logic.

### could exportGrantedSecrets use sourceAllKeysIntoEnv?

**searched**: sourceAllKeysIntoEnv export mechanism.

**found**: sourceAllKeysIntoEnv writes to process.env. GitHub Actions require GITHUB_ENV.

**decision**: cannot reuse. different runtime, different export mechanism.

---

## conclusion

no duplication of extant functionality.

### summary of investigation

| new component | extant similar | verdict | differentiation |
|---------------|----------------|---------|-----------------|
| parseSecretsInput | 14 JSON.parse sites | **no duplicate** | action-specific error message for toJSON(secrets) |
| filterToManifestKeys | getAllKeyrackSlugsForEnv | **no duplicate** | filters by manifest presence, not by env |
| processOneSecret | unlock orchestration | **no duplicate** | reads mech from value (self-descriptive), not manifest |
| exportGrantedSecrets | sourceAllKeysIntoEnv | **no duplicate** | writes to GITHUB_ENV + masks, not process.env |

### why this holds

each new component was investigated against the search methodology documented above. for each, I:
1. searched for similar patterns in the codebase
2. examined the closest match (if any)
3. articulated why reuse was not possible or appropriate
4. documented alternatives considered and rejected

### reuse summary

the blueprint reuses where appropriate:
- **6 mechanisms marked [REUSE]** — called with extant signatures, no modification
- **1 mechanism marked [EXTEND]** — mechAdapterReplica gains ghs_* fix (bug correction)

new components are created only where the action's contract differs from the CLI:
- **input source**: GitHub workflow YAML vs process.env
- **mech source**: self-descriptive blob vs host manifest
- **output target**: GITHUB_ENV file vs process.env
- **output behavior**: log mask via setSecret() (action-specific)

the action is additive. it does not modify extant CLI behavior.
