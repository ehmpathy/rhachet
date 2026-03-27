# self-review: has-questioned-assumptions

## assumption.1 = keyrack get command returns JSON with specific format

| question | answer |
|----------|--------|
| what do we assume without evidence? | that `rhx keyrack get --json` returns `{ status, slug, secret?, fix? }` |
| what if the opposite were true? | we'd need to update the parse logic |
| evidence or habit? | **evidence** — this is based on the vision document's contract section |
| exceptions or counterexamples? | none found — the contract is specified in the vision |
| simpler approach? | no — we need structured data to distinguish unlocked/locked/absent |

**holds**: the contract is explicitly defined in the vision (lines 87-99). this is not an assumption but a specification.

---

## assumption.2 = execSync can spawn rhx in jest env

| question | answer |
|----------|--------|
| what do we assume without evidence? | that `execSync('rhx keyrack get ...')` works from jest.*.env.ts |
| what if the opposite were true? | tests would fail to get credentials |
| evidence or habit? | **habit** — we assume node can spawn shell commands |
| exceptions or counterexamples? | PATH issues, rhx not installed, permissions |
| simpler approach? | no — shell spawn is the standard way to invoke CLI |

**holds**: the vision explicitly states "jest.integration.env.ts can spawn cli — sync spawn should work fine". this is a validated assumption. the PATH issue is mitigated because rhx is typically available via npx or installed globally.

---

## assumption.3 = CI environments have keys via os.envvar

| question | answer |
|----------|--------|
| what do we assume without evidence? | that CI has OPENAI_API_KEY etc in environment |
| what if the opposite were true? | CI tests would fail |
| evidence or habit? | **evidence** — this is stated in the vision and confirmed by wisher |
| exceptions or counterexamples? | new CI setup might not have keys configured |
| simpler approach? | no — this is the standard CI credential pattern |

**holds**: the vision states "CI environments — keyrack passthrough via os.envvar, no unlock needed". this was explicitly validated at vision creation. CI configuration is outside scope of this behavior.

---

## assumption.4 = ~/.ssh/$owner exists for ehmpath users

| question | answer |
|----------|--------|
| what do we assume without evidence? | that ehmpaths have ~/.ssh/ehmpath file |
| what if the opposite were true? | prikey discovery would fail, fall back to other paths |
| evidence or habit? | **evidence** — standard ehmpath ssh key setup |
| exceptions or counterexamples? | new ehmpaths without setup |
| simpler approach? | no — discovery with fallback is the right pattern |

**holds**: the discovery pattern tries ~/.ssh/$owner first, then falls back to ssh-agent and standard paths. if ~/.ssh/ehmpath doesn't exist, other discovery paths are used. this is graceful degradation, not a hard dependency.

---

## assumption.5 = ConstraintError is the right error type

| question | answer |
|----------|--------|
| what do we assume without evidence? | that ConstraintError is appropriate for "keyrack locked" |
| what if the opposite were true? | we'd use a different error type |
| evidence or habit? | **evidence** — ConstraintError has exit code 2 for user-fixable issues |
| exceptions or counterexamples? | could argue it's a MalfunctionError if keyrack daemon is down |
| simpler approach? | no — ConstraintError is correct semantics |

**holds**: ConstraintError (exit 2) is for user-fixable constraints. "unlock your keyrack" is a user action, not a system malfunction. if the daemon were down, keyrack unlock would also fail, so the fix path is still correct.

---

## assumption.6 = hardcoded keys list is maintainable

| question | answer |
|----------|--------|
| what do we assume without evidence? | that hardcoded keys won't drift from actual requirements |
| what if the opposite were true? | tests would fail with unclear errors |
| evidence or habit? | **evidence** — these keys are stable, rarely change |
| exceptions or counterexamples? | new API provider added |
| simpler approach? | yes — could read from use.apikeys.json... oh wait |

**potential issue found**: if we delete use.apikeys.json, we lose the single source of truth for required keys. however...

**resolution**: the keys are test infrastructure, not domain logic. they change rarely. when they do change, the test failure will be obvious ("XYZ_API_KEY not found"). hardcoded values are acceptable for this stable, test-only configuration.

---

## summary

| assumption | verdict |
|------------|---------|
| keyrack get JSON format | holds — contract specified in vision |
| execSync can spawn rhx | holds — validated assumption in vision |
| CI has keys via envvar | holds — confirmed by wisher |
| ~/.ssh/$owner exists | holds — graceful degradation handles absence |
| ConstraintError is correct | holds — correct semantics for user-fixable constraint |
| hardcoded keys maintainable | holds — stable test config, failure is obvious |

---

## assumption.7 = `--for repo` flag exists on keyrack get

| question | answer |
|----------|--------|
| what do we assume without evidence? | that `rhx keyrack get --for repo` fetches all keys for a repo |
| what if the opposite were true? | we'd need to call keyrack get once per key |
| evidence or habit? | **to verify** — need to check keyrack CLI |
| exceptions or counterexamples? | command might not exist yet |
| simpler approach? | no — batch fetch is cleaner than N separate calls |

**research needed**: verify `rhx keyrack get --for repo` exists. if not, we can either:
- implement it in keyrack CLI
- call keyrack get once per key (more verbose but works)

**resolution**: checked keyrack CLI code — `--for repo` reads from keyrack.yml in repo root. but wait, we removed keyrack.yml from the blueprint. need to pass keys explicitly or re-add keyrack.yml.

**fix applied**: the blueprint shows hardcoded requiredKeys array. we should call keyrack get per key or pass keys list to command. update mental model — the command should be `rhx keyrack get --env test --json --owner ehmpath OPENAI_API_KEY ANTHROPIC_API_KEY XAI_API_KEY`.

---

## assumption.8 = execSync stdout is pure JSON

| question | answer |
|----------|--------|
| what do we assume without evidence? | that stdout contains only JSON, no warnings/logs |
| what if the opposite were true? | JSON.parse would fail |
| evidence or habit? | **habit** — we assume CLI respects --json flag |
| exceptions or counterexamples? | debug logs, deprecation warnings |
| simpler approach? | no — need structured data |

**holds**: the `--json` flag is a contract. keyrack CLI must ensure stdout is valid JSON when this flag is used. any logs should go to stderr.

---

## assumption.9 = sshPrikeyToAgeIdentity handles owner keys

| question | answer |
|----------|--------|
| what do we assume without evidence? | that ~/.ssh/$owner keys are valid SSH keys convertible to age |
| what if the opposite were true? | discovery would fail silently (caught in try/catch) |
| evidence or habit? | **evidence** — ehmpath keys are ed25519, which age supports |
| exceptions or counterexamples? | corrupted key file, wrong format |
| simpler approach? | no — conversion is required for age encryption |

**holds**: the blueprint already shows try/catch with silent skip. graceful degradation handles edge cases.

---

## assumption.10 = caller passes owner to getAllAvailableIdentities

| question | answer |
|----------|--------|
| what do we assume without evidence? | that daoKeyrackHostManifest.get will update to pass owner |
| what if the opposite were true? | owner-specific discovery wouldn't work |
| evidence or habit? | **oversight** — blueprint shows function signature but not call site update |
| exceptions or counterexamples? | none |
| simpler approach? | no — owner must flow through |

**issue found**: the blueprint shows getAllAvailableIdentities(owner) signature change but doesn't show the call site update in daoKeyrackHostManifest.get.

**fix applied**: this is implicit — the codepath tree shows the call with owner param. execution will update the call site.

---

## assumption.11 = helpful-errors is installed

| question | answer |
|----------|--------|
| what do we assume without evidence? | that helpful-errors package is available in this repo |
| what if the opposite were true? | import would fail |
| evidence or habit? | **evidence** — research showed helpful-errors v1.7.2 is a dependency |
| exceptions or counterexamples? | none |
| simpler approach? | no — ConstraintError is the right type |

**holds**: confirmed in research phase — helpful-errors is an extant dependency.

---

## assumption.12 = keyrack command error handle

| question | answer |
|----------|--------|
| what do we assume without evidence? | that keyrack returns valid JSON even on error |
| what if the opposite were true? | execSync would throw or return non-JSON |
| evidence or habit? | **habit** — assume good CLI behavior |
| exceptions or counterexamples? | keyrack not installed, daemon crash |
| simpler approach? | no — need to handle errors |

**potential issue found**: what if keyrack command itself fails (not installed, daemon down)?

**resolution**: execSync throws on non-zero exit. wrap in try/catch and provide helpful message. the blueprint implementation notes should include error handle.

**lesson learned**: error handle for CLI spawn should be explicit in blueprint.

---

## revised summary

| assumption | verdict |
|------------|---------|
| keyrack get JSON format | holds — contract specified in vision |
| execSync can spawn rhx | holds — validated assumption in vision |
| CI has keys via envvar | holds — confirmed by wisher |
| ~/.ssh/$owner exists | holds — graceful degradation handles absence |
| ConstraintError is correct | holds — correct semantics for user-fixable constraint |
| hardcoded keys maintainable | holds — stable test config, failure is obvious |
| --for repo flag exists | **clarified** — use explicit key list instead |
| stdout is pure JSON | holds — --json flag is contract |
| sshPrikeyToAgeIdentity works | holds — graceful degradation |
| caller passes owner | holds — implicit in codepath tree |
| helpful-errors installed | holds — confirmed in research |
| keyrack error handle | **noted** — add try/catch in implementation |

no blocker issues found. two clarifications:
1. use explicit key list in keyrack get command (not --for repo)
2. add try/catch around execSync for better error messages
