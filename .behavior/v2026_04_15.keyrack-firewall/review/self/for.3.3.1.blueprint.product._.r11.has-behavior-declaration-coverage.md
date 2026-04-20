# self-review: has-behavior-declaration-coverage

review for coverage of the behavior declaration.

---

## search methodology

before I verified coverage, I compiled requirements from:
1. reviewed vision requirements via `for.1.vision._.r1.has-questioned-requirements.md`
2. reviewed research citations via `for.3.3.1.blueprint.product._.r1.has-research-citations.md`
3. reviewed assumptions via `for.3.3.1.blueprint.product._.r4.has-questioned-assumptions.md`
4. reviewed test coverage via `for.3.3.1.blueprint.product._.r7.has-thorough-test-coverage.md`
5. examined the original wish handoff in `0.wish.md`

---

## vision requirements coverage

### requirement 1: github action for translation

**vision statement**: the CI translation gap must be solved via a github action that translates credential blobs at workflow start.

**blueprint coverage**:
- `keyrack/firewall/action.yml` — node20 action that runs at workflow start
- `processOneSecret.ts` — detects mech field, routes to adapter, returns translated token
- `index.ts` — orchestrates parse → filter → process → export flow

**why it holds**: the blueprint specifies a complete github action with entry point, orchestration, and mechanism routing. the action receives all secrets, processes each, and exports translated values to GITHUB_ENV.

### requirement 2: self-descriptive blobs with `mech` field

**vision statement**: credential blobs must include a `mech` field that declares which mechanism adapter to use.

**blueprint coverage**:
- `processOneSecret.ts` — parses JSON, extracts `mech` field, routes to corresponding adapter
- mech detection code: `JSON.parse(secretValue).mech`
- supported mechs: EPHEMERAL_VIA_GITHUB_APP, EPHEMERAL_VIA_AWS_SSO, PERMANENT_VIA_REPLICA

**why it holds**: the blueprint explicitly handles mech field extraction. the codepath tree shows the mech detection and routing logic. secrets without mech field fall through to passthrough validation.

### requirement 3: firewall blocks dangerous tokens

**vision statement**: long-lived tokens (ghp_*, AKIA*) must be blocked. short-lived tokens (ghs_*) must be allowed.

**blueprint coverage**:
- `mechAdapterReplica.validate()` — applies LONG_LIVED_PATTERNS regex check
- `processOneSecret.ts` — calls validate() for secrets without translation
- LONG_LIVED_PATTERNS fix — removes ghs_* (short-lived, 1-hour max lifetime)
- blocked patterns: `/^ghp_[a-zA-Z0-9]{36}$/`, `/^gho_[a-zA-Z0-9]{36}$/`, `/^ghu_[a-zA-Z0-9]{36}$/`, `/^ghr_[a-zA-Z0-9]{36}$/`, `/^AKIA[0-9A-Z]{16}$/`

**why it holds**: the blueprint reuses extant firewall validation logic and fixes the ghs_* classification error. dangerous tokens are blocked; safe translated tokens pass.

### requirement 4: fail-fast behavior

**vision statement**: when one key is blocked, the action should fail immediately (not process remaining keys).

**blueprint coverage**:
- `index.ts` — sequential process with early exit on block result
- test case: "one key blocked → fail fast"
- exit code: 2 for blocked (constraint error)

**why it holds**: the blueprint test coverage explicitly includes fail-fast behavior. the orchestrator breaks loop on first block result.

### requirement 5: backwards compatibility

**vision statement**: secrets without `mech` field should pass through to firewall validation (assume PERMANENT_VIA_REPLICA).

**blueprint coverage**:
- `processOneSecret.ts` — `if (!mech) return passthrough with firewall validation`
- fallback behavior: safe strings pass, dangerous patterns blocked
- test case: "no mech, safe → passthrough"

**why it holds**: the blueprint handles the no-mech case explicitly. extant CI secrets that are simple strings will pass through to firewall validation. no migration required.

---

## wish handoff coverage

the original wish described:

| requirement | blueprint coverage | status |
|-------------|-------------------|--------|
| pass all secrets from github.secrets | `secrets: ${{ toJSON(secrets) }}` input | **covered** |
| only consider keys in keyrack.yml | `filterToManifestKeys.ts` filters to declared keys | **covered** |
| translate those (or passthrough) | `processOneSecret.ts` routes mech or passthrough | **covered** |
| downstream steps get env vars | `exportGrantedSecrets.ts` calls core.exportVariable() | **covered** |

the handoff problem:
- **problem**: EHMPATH_BEAVER_GITHUB_TOKEN (JSON blob) passed through as raw JSON
- **solution**: action detects mech field, routes to mechAdapterGithubApp, returns ghs_* token

**why it holds**: the blueprint solves the exact problem in the handoff. JSON blobs with `mech: "EPHEMERAL_VIA_GITHUB_APP"` are translated to ghs_* tokens. the downstream test expects `token.startsWith('ghs_')` and will now pass.

---

## research pattern coverage

| pattern | research decision | blueprint usage | status |
|---------|------------------|-----------------|--------|
| mechAdapterGithubApp | [REUSE] | processOneSecret routes to deliverForGet() | **covered** |
| mechAdapterAwsSso | [REUSE] | processOneSecret routes to deliverForGet() | **covered** |
| mechAdapterReplica | [EXTEND] | processOneSecret calls validate() + fix ghs_* | **covered** |
| LONG_LIVED_PATTERNS | [EXTEND] | remove ghs_* from patterns | **covered** |
| KeyrackGrantMechanism | [REUSE] | mech type for routing | **covered** |
| KeyrackGrantAttempt | [REUSE] | output structure | **covered** |
| daoKeyrackRepoManifest | [REUSE] | filterToManifestKeys reads manifest | **covered** |
| sourceAllKeysIntoEnv | [EXTEND] | similar pattern with core.* APIs | **covered** |

**why it holds**: every research pattern marked [REUSE] or [EXTEND] appears in the blueprint with explicit usage.

---

## test criteria coverage

from the test coverage review, every criterion is mapped:

### parseSecretsInput criteria

| criterion | test case | covered? |
|-----------|-----------|----------|
| valid JSON | valid JSON → parsed object | yes |
| malformed JSON | malformed JSON → error with hint | yes |
| empty object | empty object → empty record | yes |

### filterToManifestKeys criteria

| criterion | test case | covered? |
|-----------|-----------|----------|
| overlap filter | 10 secrets, 2 declared → 2 returned | yes |
| no overlap | 0 declared → 0 returned | yes |
| asymmetry | key declared but absent → absent | yes |

### processOneSecret criteria

| criterion | test case | covered? |
|-----------|-----------|----------|
| github app translation | mech: EPHEMERAL_VIA_GITHUB_APP → ghs_* | yes |
| safe passthrough | no mech, safe → passthrough | yes |
| unknown mech | mech: unknown → error | yes |
| ghp_* blocked | no mech, ghp_* → blocked | yes |
| AKIA* blocked | no mech, AKIA* → blocked | yes |
| api error | translation api error | yes |

### exportGrantedSecrets criteria

| criterion | test case | covered? |
|-----------|-----------|----------|
| export grants | granted keys → setSecret + exportVariable | yes |
| empty grants | empty grants → no calls | yes |

### full action criteria

| criterion | test case | covered? |
|-----------|-----------|----------|
| all granted | all keys granted → success | yes |
| one blocked | one key blocked → fail fast | yes |
| translation error | translation api error | yes |
| missing manifest | keyrack.yml absent → error | yes |
| partial fail | mixed results → fail fast | yes |

**why it holds**: every criterion maps to a test case. no criterion is omitted.

---

## issues found

none. all vision requirements, wish handoff requirements, research patterns, and test criteria are covered in the blueprint.

---

## conclusion

| category | requirements | covered | gaps |
|----------|-------------|---------|------|
| vision requirements | 5 | 5 | 0 |
| wish handoff | 4 | 4 | 0 |
| research patterns | 8 | 8 | 0 |
| test criteria | 17 | 17 | 0 |

**total coverage**: 34/34 requirements addressed.

the blueprint provides complete coverage of the behavior declaration. no requirements were omitted by the junior implementation.
