# self-review: has-divergence-addressed (round 3)

## deeper skepticism: could any divergence cause problems later?

### 1. getOnePrikeyForOwner removed — future risk assessment

**original intent:** blueprint wanted explicit prikey finder operation.

**actual approach:** reused `genKeyrackHostContext({ prikeys })`.

**could this cause problems?**

- if we later need to find prikey without full host context: no function exists
- but: prikey discovery without host context decryption is rare/hypothetical
- the discovered prikey is needed precisely to decrypt the host manifest
- genKeyrackHostContext returns the discovered identity in its result

**risk level:** low. if need arises, can extract later. YAGNI applies.

### 2. genMockKeyrackRepoManifest removed — future risk assessment

**original intent:** shared test fixture for manifest mocks.

**actual approach:** inline mocks in each test.

**could this cause problems?**

- if manifest shape changes, must update multiple test files
- but: manifest shape is stable (keyrack.yml schema)
- inline mocks are minimal (only what each test needs)
- shared fixtures often become overly complex

**risk level:** low. inline mocks are more maintainable in practice.

### 3. --repair and --allow-dangerous flags added — future risk assessment

**original intent:** blueprint did not anticipate blocked keys.

**actual approach:** fail-fast with opt-in flags for user control.

**could this cause problems?**

- adds cognitive load: user must understand blocked vs allowed
- but: without these flags, fill would fail unexpectedly
- flags match keyrack's principle of explicit user consent
- hint text guides user to correct action

**risk level:** low. improves UX by handle real edge case.

### 4. withStdoutPrefix added — future risk assessment

**original intent:** blueprint implied nested output but did not specify mechanism.

**actual approach:** utility that prefixes each stdout line.

**could this cause problems?**

- if setKeyrackKey changes output format: prefix may misalign
- but: setKeyrackKey output is stable (tree-format convention)
- withStdoutPrefix is general-purpose, testable, isolated

**risk level:** low. utility is simple and well-tested.

## summary

reviewed each divergence for future risk. all have low risk:

| divergence | risk | mitigation |
|------------|------|------------|
| getOnePrikeyForOwner removed | low | can extract later if needed |
| genMockKeyrackRepoManifest removed | low | inline mocks are stable |
| --repair/--allow-dangerous added | low | matches keyrack patterns |
| withStdoutPrefix added | low | well-tested utility |

no divergence creates technical debt or maintenance burden.
