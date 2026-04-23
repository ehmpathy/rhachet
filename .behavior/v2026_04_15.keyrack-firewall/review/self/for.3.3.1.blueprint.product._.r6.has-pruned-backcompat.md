# self-review: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## backwards compatibility concerns examined

### 1. ghs_* removal from LONG_LIVED_PATTERNS

**the change**: blueprint specifies removal of `/^ghs_[a-zA-Z0-9]{36}$/` from LONG_LIVED_PATTERNS in mechAdapterReplica.ts.

**was this explicitly requested?** yes, implicitly. the vision requires the firewall to translate github app blobs to ghs_* tokens. if ghs_* stayed in LONG_LIVED_PATTERNS, the firewall would block its own output.

**is this backwards-compatible?** yes. the extant keyrack subsystem does not rely on ghs_* blocked status. the LONG_LIVED_PATTERNS list is used by mechAdapterReplica.validate() which is called during PERMANENT_VIA_REPLICA flows. ephemeral mechanisms (github app, aws sso) produce short-lived tokens and do not go through this validation.

**why it holds**: this is not a backwards-compat concern but a bug fix. ghs_* tokens have 1-hour max lifetime enforced by GitHub's API. they should never have been in the "long-lived" list. this correction does not change any expected behavior.

### 2. mechanism adapter reuse

**the change**: blueprint reuses mechAdapterGithubApp, mechAdapterAwsSso, mechAdapterReplica.

**was backwards compatibility explicitly requested?** no mention of backwards compatibility requirements for mechanism adapters.

**is this backwards-compatible?** yes. the blueprint uses `[REUSE]` markers meaning these adapters are imported and called without modification. the extant `deliverForGet()` signatures are preserved.

**why it holds**: reuse inherently preserves backwards compatibility. the action calls extant adapter methods with extant signatures. no adapter logic is changed, only consumed.

### 3. daoKeyrackRepoManifest reuse

**the change**: blueprint reuses daoKeyrackRepoManifest to read keyrack.yml.

**was backwards compatibility explicitly requested?** no.

**is this backwards-compatible?** yes. the blueprint uses `[REUSE]` marker meaning the DAO is imported and called without modification.

**why it holds**: the action calls `daoKeyrackRepoManifest.get({ gitroot })` with the same signature as extant callers. no change to DAO behavior or structure.

### 4. new action does not affect extant keyrack CLI

**the concern**: could the new firewall action change behavior of `rhx keyrack` commands?

**analysis**: no. the action lives in `keyrack/firewall/` as a separate package with its own package.json. it imports from `src/` but does not modify any src/ files except the ghs_* bug fix.

**why it holds**: the action is additive. it adds a new entry point (GitHub Action) that reuses extant logic. the extant CLI entry points are untouched.

---

## backwards-compat concerns we consciously avoided

the review's primary purpose is to identify backwards-compat that was added "to be safe" without explicit request. I examined what we COULD have added but chose not to.

### could we have added: a flag to preserve ghs_* block behavior?

**the temptation**: add `--legacy-block-ghs` flag that keeps ghs_* in LONG_LIVED_PATTERNS for repos that somehow depend on ghs_* blocked.

**why we did NOT add this**: there is no evidence that any repo depends on ghs_* blocked. ghs_* tokens are the OUTPUT of EPHEMERAL_VIA_GITHUB_APP mechanism — they are short-lived by design. any repo that blocks ghs_* would block its own github app tokens, which would be a defect, not intended behavior.

**verdict**: no backwards-compat flag needed. this is a pure bug fix.

### could we have added: version detection for mechanism adapter signatures?

**the temptation**: add version checks so the action gracefully handles "old" and "new" adapter signatures.

**why we did NOT add this**: mechanism adapter signatures are stable. `deliverForGet()` has a fixed contract. there are no "versions" of these adapters. version detection would be premature abstraction for hypothetical change.

**verdict**: no version compat needed. adapters are reused without modification.

### could we have added: fallback behavior if keyrack.yml format changes?

**the temptation**: add schema version detection and migration logic for keyrack.yml format changes.

**why we did NOT add this**: the blueprint does not change keyrack.yml format. it reuses daoKeyrackRepoManifest which reads the extant format. there is no format migration to handle.

**verdict**: no format compat needed. DAO handles extant format unchanged.

### could we have added: compat shim for prior action versions?

**the temptation**: add inputs like `--compat-v0` to handle migration from prior action versions.

**why we did NOT add this**: there is no prior version of the firewall action. this is a new action. there is no extant behavior to be backwards-compatible with.

**verdict**: no version compat needed. this is v1.

---

## backwards-compat concerns NOT found

these areas have no backwards-compat concerns:

| area | why it holds |
|------|-------------|
| keyrack CLI commands | action is additive, CLI code untouched. no shared state, no shared entry points. |
| mechanism adapter signatures | reused via `[REUSE]` marker. `deliverForGet()` called with extant signature. no modification to adapters. |
| daoKeyrackRepoManifest | reused via `[REUSE]` marker. `get({ gitroot })` called with extant signature. no modification to DAO. |
| LONG_LIVED_PATTERNS | bug fix removes ghs_* which never should have been there. no extant behavior depends on ghs_* blocked status. |
| test fixtures | new fixtures in `with-firewall-action-test/`. no modification to extant test fixtures. |
| CI workflows | new workflow `.test-firewall-action.yml`. no modification to extant CI workflows. |

---

## open questions for wisher

none. the blueprint does not include any backwards-compatibility concerns that were not explicitly requested or inherently required.

---

## conclusion

backwards compatibility analysis complete.

**changes to extant code**: only one — ghs_* removal from LONG_LIVED_PATTERNS. this is a bug fix, not a backwards-compat concern.

**reused components**: mechanism adapters and daoKeyrackRepoManifest are imported without modification. backwards compatibility is inherent in reuse.

**new components**: the firewall action is additive. it does not change behavior of extant keyrack subsystem.

no unnecessary backwards-compat concerns were added "to be safe". the blueprint is focused on the new functionality without scope creep into extant behavior.
