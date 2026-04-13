# self-review r1: has-research-traceability

## purpose

verify that every research recommendation appears in the blueprint. articulate why each trace holds.

---

## research → blueprint traceability

### from 3.1.3.research.internal.product.code.prod._.yield.md

#### pattern.1: KeyrackKeySpec.mech nullable

| research | [REUSE] — already modified to support null mech |
|----------|------------------------------------------------|
| blueprint | section "1. KeyrackKeySpec.mech nullable" with diff |
| trace | **holds** — research cites lines 17-21 with `mech: KeyrackGrantMechanism \| null`. blueprint shows same change in diff format: `- mech: KeyrackGrantMechanism;` → `+ mech: KeyrackGrantMechanism \| null;`. the blueprint also explains why: "allows manifest to declare 'no mech constraint' so vault adapter prompts." |

#### pattern.2: hydrateKeyrackRepoManifest mech: null

| research | [REUSE] — already modified to remove hardcoded default |
|----------|--------------------------------------------------------|
| blueprint | section "2. hydrateKeyrackRepoManifest removes hardcode" with diff |
| trace | **holds** — research cites 3 locations (lines 83-89, 97-103, 112-118) where `mech: null` replaced `mech: 'PERMANENT_VIA_REPLICA'`. blueprint codepath tree shows all three: "env.all keys → mech: null", "expanded keys → mech: null", "env-specific keys → mech: null". the blueprint labels this "root cause fix". |

#### pattern.3: inferKeyrackMechForSet

| research | [REUSE] — no changes needed, already handles null mech |
|----------|--------------------------------------------------------|
| blueprint | codepath tree node "inferKeyrackMechForSet # prompts 'which mechanism?'" |
| trace | **holds** — research explains this function auto-selects when vault supports one mech, prompts when multiple. blueprint codepath tree shows it under "mech null + vault supports multiple mechs" branch. no [~] marker in blueprint = no changes = matches [REUSE] annotation. |

#### pattern.4: vaultAdapterOsSecure.set

| research | [REUSE] — no changes needed, already calls inferKeyrackMechForSet |
|----------|------------------------------------------------------------------|
| blueprint | codepath tree node "vault.set({ slug, mech: keySpec?.mech ?? null, ... })" |
| trace | **holds** — research shows lines 170-174 where vault.set infers mech if not supplied. blueprint shows fill passes `keySpec?.mech ?? null` to vault.set, which then dispatches to mech inference. no [~] marker = no changes = matches [REUSE]. |

#### pattern.5: mechAdapterGithubApp tilde expansion

| research | [EXTEND] — added homedir() expansion for pem path |
|--------------------------------------------------|
| blueprint | section "3. mechAdapterGithubApp tilde expansion" with diff |
| trace | **holds** — research shows [EXTEND] with lines 204-207 (`pemPathExpanded = pemPath.trim().replace(...)`). blueprint diff shows identical change. the [~] marker in blueprint filediff tree matches [EXTEND] annotation. blueprint explains why: "Node doesn't expand `~` like shell. user paths with `~/` failed with ENOENT." |

#### pattern.6: mechAdapterReplica

| research | [REUSE] — no changes needed |
|----------|----------------------------|
| blueprint | codepath tree node "mechAdapterReplica.acquireForSet # prompts for secret" |
| trace | **holds** — research explains this adapter handles PERMANENT_VIA_REPLICA flow. blueprint shows it in codepath tree under "mech inferred" branch. no [~] marker = no changes = matches [REUSE]. static secret flow remains unchanged. |

---

### from 3.1.3.research.internal.product.code.test._.yield.md

#### pattern.1: hydrateKeyrackRepoManifest.test

| research | [REUSE] — no changes needed, tests already pass with null mech |
|----------|--------------------------------------------------------------|
| blueprint | test tree: "hydrateKeyrackRepoManifest.test.ts # unit: keys hydrated correctly" |
| trace | **holds** — research notes tests verify key hydration but don't assert mech value. blueprint marks with [○] (retain). research gap analysis says "mech null passes" — blueprint test coverage table confirms "○ retain — tests pass". |

#### pattern.2: mechAdapterGithubApp.test

| research | [REUSE] — no changes needed |
|----------|----------------------------|
| blueprint | test tree: "mechAdapterGithubApp.test.ts # unit: json validation" |
| trace | **holds** — research explains tests validate credentials json format, not tilde expansion (which is in acquireForSet, requires stdin). blueprint marks [○]. tilde expansion is "implicit" per blueprint coverage table — no explicit unit test, which matches research. |

#### pattern.3: fillKeyrackKeys.integration

| research | [REUSE] — uses mock stdin prompts, already supports mech selection flow |
|----------|------------------------------------------------------------------------|
| blueprint | test tree: "fillKeyrackKeys.integration.test.ts # integration: fill journeys" |
| trace | **holds** — research shows test infra with `genMockPromptHiddenInput` and `setMockPromptValues`. blueprint marks [○]. research notes mock stdin would need extension for mech prompts (readline), but blueprint says "no new tests required — changes are minimal". |

#### pattern.4: createTestHomeWithSshKey

| research | [REUSE] — provides isolated test HOME with ssh key for identity discovery |
|----------|--------------------------------------------------------------------------|
| blueprint | implicit in integration test infrastructure |
| trace | **holds** — research shows this helper enables real key discovery. blueprint doesn't explicitly list it but integration tests depend on it. research says "no changes needed" = blueprint doesn't mention changes to it. |

---

## gap analysis

checked for omissions — any research recommendation not in blueprint:

| pattern | in blueprint? | notes |
|---------|---------------|-------|
| KeyrackKeySpec.mech nullable | yes | changes detail section 1 |
| hydrateKeyrackRepoManifest | yes | changes detail section 2, codepath tree |
| inferKeyrackMechForSet | yes | codepath tree |
| vaultAdapterOsSecure.set | yes | codepath tree |
| mechAdapterGithubApp tilde | yes | changes detail section 3, filediff tree |
| mechAdapterReplica | yes | codepath tree |
| test patterns (4) | yes | test tree, coverage table |

**no omissions found.**

---

## conclusion

all 6 prod patterns and 4 test patterns from research are reflected in the blueprint:
- [REUSE] patterns appear without [~] markers (no changes needed)
- [EXTEND] patterns appear with [~] markers and explicit diffs
- test tree covers all test file patterns
- codepath tree traces the runtime flow

the blueprint is complete relative to research.
