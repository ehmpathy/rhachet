# self-review: has-questioned-assumptions

question all assumptions. verify each holds.

---

## assumptions questioned

### 1. node20 runtime available

**assumption**: github actions runners have node 20 available via `using: 'node20'`.

**what if opposite were true?** if node20 were not available, the action would fail at startup with "unsupported node version" error. users would be blocked from use.

**evidence examined**:
- github docs explicitly list node20 as supported runtime (added 2023)
- node16 is deprecated, node20 is the current standard
- ubuntu-latest, macos-latest, windows-latest all include node 20.x
- @actions/core 1.10.0 supports node20

**could a simpler approach work?** node16 would work but is deprecated. node20 is the right choice for longevity.

**why it holds**: node20 is explicitly supported by github. choosing node16 would create technical debt. the assumption is not based on habit but on current platform capabilities.

### 2. @vercel/ncc bundles all deps

**assumption**: ncc will bundle @actions/core and all keyrack imports into a single dist/index.js.

**what if opposite were true?** if ncc failed to bundle, action would crash with "cannot find module" at runtime. this would be a complete blocker.

**evidence examined**:
- ncc is the tool github recommends for action bundled output
- ehmpathy repos already use ncc for similar bundled artifacts (confirmed in research)
- ncc follows import paths at bundle time via webpack-like analysis
- the mechanism adapters use static imports (not dynamic require())

**could a simpler approach work?** could ship node_modules with action, but this bloats the action and creates versioning issues. ncc is the standard approach.

**risk I found**: if any mechanism adapter uses `require(variable)` instead of `require('literal')`, ncc cannot statically analyze it. this would cause runtime failure.

**why it holds**: I reviewed the mechanism adapter code patterns. they use static imports. the bundle approach is correct. however, the acceptance test workflow must verify the bundled action runs — this is the safety net. the assumption holds with verification.

### 3. toJSON(secrets) produces valid JSON

**assumption**: `${{ toJSON(secrets) }}` always produces valid JSON that can be parsed.

**what if opposite were true?** if toJSON produced invalid JSON, parseSecretsInput would fail. the action would crash on every invocation.

**evidence examined**:
- github docs define toJSON as a serialization function that converts any value to JSON
- secrets context is a plain object with string keys and string values
- github controls both the serialization and the secrets storage format
- there is no user-controlled path that could inject malformed JSON into toJSON

**could a simpler approach work?** no. toJSON(secrets) is the only way to pass all secrets to an action. there is no alternative.

**why it holds**: toJSON is a github-controlled function. it cannot produce invalid JSON by design. the only way JSON.parse could fail is if the user somehow injects a malformed secrets input — which is not possible via the standard workflow syntax. the assumption holds.

### 4. keyrack.yml at .agent/keyrack.yml

**assumption**: daoKeyrackRepoManifest reads from `.agent/keyrack.yml` at repo root.

**what if opposite were true?** if keyrack.yml were elsewhere, filterToManifestKeys would fail to find declared keys. all keys would be filtered out. action would succeed but produce no output.

**evidence examined**:
- daoKeyrackRepoManifest code uses `.agent/keyrack.yml` path (confirmed in research)
- vision document confirms this location (line 125 "filters to only keys declared in keyrack.yml")
- all ehmpathy repos use this convention

**risk I found**: the action entry point runs from `keyrack/firewall/` directory, not repo root. if we use `process.cwd()`, we get the wrong path.

**could a simpler approach work?** could accept keyrack.yml path as input. but this adds config burden. GITHUB_WORKSPACE is the standard solution.

**why it holds**: the action must use `process.env.GITHUB_WORKSPACE` to get repo root, not `process.cwd()`. this is explicitly handled in the blueprint architecture diagram. the assumption holds because the solution accounts for the working directory issue.

### 5. mechanism adapters are importable

**assumption**: mechAdapterGithubApp, mechAdapterAwsSso, mechAdapterReplica can be imported from src/.

**what if opposite were true?** if adapters were not importable, bundle would fail at compile time with import errors. this would be caught before merge.

**evidence examined**:
- codepath tree shows [←] reuse markers for these adapters
- research yield confirms adapters exist at `src/domain.operations/keyrack/adapters/mechanisms/`
- adapters are already used in keyrack subsystem with same import pattern

**risk I found**: the action lives in `keyrack/firewall/` but imports from `../../src/...`. the relative import paths must be correct in the bundled output.

**could a simpler approach work?** could copy adapter code into action. but this violates DRY and creates maintenance burden. reuse is correct.

**why it holds**: ncc follows import paths and bundles all dependencies. the relative imports will be traced correctly at bundle time. the acceptance test workflow verifies the bundled action works — if imports were wrong, this test would fail. the assumption holds with verification.

### 6. 40KB secret limit is sufficient

**assumption**: 40KB defensive limit covers all realistic secrets.

**what if opposite were true?** if secrets legitimately exceeded 40KB, users would be blocked from use. the action would fail with a size error.

**evidence examined**:
- research [KHUE] shows github enforces 48KB limit on secrets
- JSON escape overhead can add 10-20% to string size
- UTF-8 vs ASCII differences can affect byte count
- 40KB leaves 8KB buffer for overhead

**exceptions or counterexamples**: large RSA private keys could approach 4KB. a github app credential blob with permissions could reach 10KB. but 40KB is still well above realistic sizes.

**could a simpler approach work?** could use 48KB limit directly. but 40KB provides defensive margin without meaningfully restricting users.

**why it holds**: no realistic secret exceeds 40KB. the 8KB buffer accounts for serialization overhead. the limit is defensive, not restrictive. the assumption holds.

### 7. core.exportVariable writes to GITHUB_ENV

**assumption**: @actions/core exportVariable() makes env vars available to subsequent steps.

**what if opposite were true?** if exportVariable did not work, downstream steps would not receive translated credentials. the action would be useless.

**evidence examined**:
- github docs explicitly state exportVariable() writes to GITHUB_ENV file
- GITHUB_ENV is the standard mechanism for cross-step env var sharing
- @actions/core is the official github actions toolkit

**could a simpler approach work?** could write to GITHUB_ENV file directly. but @actions/core handles multiline values and escape sequences correctly. using the library is correct.

**why it holds**: this is documented, official behavior. exportVariable is the recommended approach. the assumption is based on github's own documentation, not habit.

### 8. core.setSecret masks in logs

**assumption**: @actions/core setSecret() prevents values from appearing in logs.

**what if opposite were true?** if setSecret did not work, secrets would leak in CI logs. this would be a security vulnerability.

**evidence examined**:
- github docs confirm setSecret registers values for log masking
- masking applies to all subsequent log output in the workflow
- @actions/core is the official mechanism for this

**risk I found**: if we log a value before calling setSecret, it would already be exposed. order of operations matters.

**why it holds**: the blueprint specifies calling setSecret before exportVariable. this ensures the value is masked before any log output could occur. the order is correct. the assumption holds.

### 9. mech field detection is reliable

**assumption**: detectMech() can parse JSON and find mech field reliably.

**what if opposite were true?** if mech detection failed, self-descriptive blobs would not be translated. they would pass through as raw JSON. downstream would fail.

**evidence examined**:
- self-descriptive blobs are JSON objects with explicit `"mech": "MECHANISM_NAME"` field
- the vision specifies this format (line 56-57)
- detectMech uses try/catch to handle parse failures gracefully

**risk I found**: a secret value that is valid JSON but lacks a mech field would return null. this is correct — it should pass through to firewall validation.

**could a simpler approach work?** could check for JSON pattern without parse. but full parse is needed to extract the mech value. parse is correct.

**why it holds**: the detectMech function handles all cases:
- valid JSON with mech field → returns mechanism
- valid JSON without mech field → returns null (passthrough)
- invalid JSON → returns null (passthrough to firewall)

the fallback to passthrough is the safe default. the assumption holds.

### 10. LONG_LIVED_PATTERNS are correct (after fix)

**assumption**: after removal of ghs_* from LONG_LIVED_PATTERNS, the patterns correctly identify dangerous tokens.

**what if opposite were true?** if patterns were wrong, we would either:
- block safe tokens (false positive) — users frustrated
- allow dangerous tokens (false negative) — security risk

**evidence examined**:
- ghp_* = classic PAT — no expiry, permanent, dangerous
- gho_* = oauth token — permanent until revoked, dangerous
- ghu_* = user-to-server token — long-lived, dangerous
- ghr_* = refresh token — permanent until revoked, dangerous
- AKIA* = AWS access key — permanent until rotated, dangerous
- ghs_* = installation access token — **1 hour max lifetime**, enforced by GitHub API

**the ghs_* question**: why was ghs_* ever in LONG_LIVED_PATTERNS?

I believe it was a misunderstanding. "server-to-server" sounds permanent, but ghs_* tokens are the OUTPUT of EPHEMERAL_VIA_GITHUB_APP translation. github enforces a 1-hour maximum lifetime on these tokens. they are short-lived by design.

**why it holds**: the fix removes ghs_* because it is not a long-lived token. the remaining patterns are all genuinely dangerous permanent credentials. the assumption holds because it is grounded in github's documented token lifetime behavior.

---

## issues found and fixed

### issue 1: ghs_* was incorrectly classified as long-lived

**before**: LONG_LIVED_PATTERNS included `/^ghs_[a-zA-Z0-9]{36}$/`

**analysis**: ghs_* tokens are installation access tokens from EPHEMERAL_VIA_GITHUB_APP mechanism. github enforces 1-hour maximum lifetime. these are SHORT-lived, not long-lived.

**fix applied**: blueprint specifies removal of ghs_* from LONG_LIVED_PATTERNS with explicit rationale.

**why this matters**: without this fix, the firewall would block its own output. translated github app credentials would be rejected.

---

## conclusion

all 10 technical assumptions have been questioned with depth:

| assumption | questioning approach | verdict |
|------------|---------------------|---------|
| node20 runtime | checked github docs, considered alternatives | holds |
| ncc bundles deps | examined bundle mechanism, identified static import requirement | holds with verification |
| toJSON valid JSON | traced data flow, confirmed github controls format | holds |
| keyrack.yml location | identified working directory risk, confirmed GITHUB_WORKSPACE solution | holds |
| adapters importable | traced import paths, confirmed ncc analysis | holds with verification |
| 40KB limit | calculated overhead, confirmed defensive margin | holds |
| exportVariable | verified official docs, confirmed recommended approach | holds |
| setSecret | identified order of operations risk, confirmed correct sequence | holds |
| mech detection | analyzed all code paths, confirmed graceful fallback | holds |
| LONG_LIVED_PATTERNS | researched token lifetimes, identified and fixed ghs_* error | holds |

**one issue found and already fixed**: ghs_* removal from LONG_LIVED_PATTERNS was already in the blueprint. the questioning confirmed this fix is correct.

**two assumptions require runtime verification**:
1. ncc bundles all deps correctly — acceptance test workflow verifies
2. mechanism adapters are included in bundle — acceptance test workflow verifies

the acceptance test workflow in the blueprint provides the verification net for these assumptions.
