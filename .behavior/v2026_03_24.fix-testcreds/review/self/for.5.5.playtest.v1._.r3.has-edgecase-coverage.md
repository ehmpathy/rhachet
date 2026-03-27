# review: has-edgecase-coverage

## question

are edge cases covered?
- what could go wrong?
- what inputs are unusual but valid?
- are boundaries tested?

## review

### what could go wrong?

| failure mode | playtest coverage | status |
|--------------|-------------------|--------|
| keyrack not installed | prereqs: rhachet must be installed | ✓ covered |
| ssh key not at expected location | prereqs: ssh key at ~/.ssh/ehmpath | ✓ covered |
| wrong owner specified | all commands hardcode --owner ehmpath | ✓ covered |
| keyrack daemon not started | keyrack unlock starts daemon automatically | ✓ handled by keyrack core |
| keys absent from vault | edgey paths: absent keys section | ✓ covered |
| keys locked (not unlocked) | step 2 note: explains conditional behavior | ✓ explained |
| CI env vars not set | step 5: explicit test with env vars | ✓ covered |
| partial env passthrough (some keys in env, some locked) | not covered | see analysis below |
| prikey passphrase protected, not in agent | not covered | see analysis below |

### boundary analysis

| boundary | test step | why it holds |
|----------|-----------|--------------|
| all keys unlocked | step 3, step 4 | integration and acceptance tests run with unlocked keyrack |
| all keys via env passthrough | step 5 | explicit test sets all three keys as env vars |
| all keys absent | edgey paths | `rhx keyrack get` shows absent status with set hints |
| zero keys declared | step 2 note | keyrack.source() succeeds when no keys required — explained |

### not covered: partial env passthrough

**scenario:** some keys present as env vars, some keys locked in keyrack.

**why omission is acceptable:**

1. **keyrack core handles this**: keyrack checks env vars first for each key individually. if a key is present in env, it uses that; if absent from env, it falls back to vault. this is keyrack core logic, tested in keyrack acceptance tests.

2. **not behavior-specific**: this behavior integrates keyrack.source() into jest env files. the partial passthrough is keyrack internal behavior, not the integration point.

3. **real-world rarity**: CI environments either set all keys (GitHub Actions secrets) or none. partial passthrough is unusual in practice.

**verdict:** acceptable to omit — keyrack core handles mixed state.

### not covered: prikey passphrase protected without agent

**scenario:** ssh key at ~/.ssh/ehmpath has a passphrase but is not loaded into ssh-agent.

**why omission is acceptable:**

1. **keyrack core behavior**: prikey passphrase handling is keyrack unlock logic, not keyrack.source() logic.

2. **prereqs imply readiness**: playtest prereqs state "ssh key at ~/.ssh/ehmpath" and "keyrack secrets populated". a developer with these prereqs has already set up their keyrack.

3. **daemon caches unlocked keys**: once unlocked, keyrack daemon holds keys for the session. subsequent calls to keyrack.source() do not need the prikey again.

**verdict:** acceptable to omit — keyrack core handles prikey prompts.

### unusual but valid inputs

| unusual input | coverage | why it holds |
|---------------|----------|--------------|
| tests run before keyrack installed | prereqs: rhachet required | foreman validates prereqs before playtest |
| different owner (not ehmpath) | not covered | this behavior hardcodes ehmpath intentionally |
| expired keyrack session | not covered | keyrack core handles re-prompt |

**analysis of "different owner":** the wish and vision explicitly state "we expect ehmpaths to work in this repo". the hardcoded --owner ehmpath is intentional, not an oversight. other owners are out of scope.

**analysis of "expired session":** keyrack daemon handles session expiry by prompt for re-unlock. this is core keyrack behavior with dedicated tests.

### edge case checklist

| category | edge case | status |
|----------|-----------|--------|
| happy path | all keys unlocked | ✓ step 3, 4 |
| happy path | CI passthrough | ✓ step 5 |
| error path | keyrack locked | ✓ step 2 note (conditional) |
| error path | keys absent | ✓ edgey paths |
| error path | rhachet not installed | ✓ prereqs |
| error path | ssh key not found | ✓ prereqs |
| boundary | zero keys declared | ✓ step 2 note |
| boundary | all keys declared | ✓ step 3, 4 |

## reflection: why each coverage holds

### step 1 edge case: files might still exist somewhere else

**concern:** what if use.apikeys.* files were moved rather than deleted?

**why it holds:** step 1 uses `ls -la .agent/repo=.this/role=any/skills/use.apikeys.*` — the exact path where files lived. if files were moved elsewhere, git status would show them. the implementation deleted them via `git rm`, which removed from both index and working tree.

### step 2 edge case: keyrack.source() might have wrong parameters

**concern:** what if keyrack.source() is called with wrong env or owner?

**why it holds:** step 2 grep output shows exact line with parameters: `keyrack.source({ env: 'test', owner: 'ehmpath' })`. foreman can visually verify the parameters match expected values.

### step 3/4 edge case: tests might pass for wrong reasons

**concern:** what if tests pass but keys are not actually from keyrack?

**why it holds:** step 3 runs unlock first, then tests. if keyrack.source() were broken, tests would fail with "key not found" errors. the sequence proves causality: unlock → test success means keyrack delivered keys.

### step 5 edge case: env vars might be ignored

**concern:** what if keyrack.source() ignores env vars and requires vault unlock?

**why it holds:** step 5 explicitly relocks keyrack before test. if env var passthrough were broken, tests would fail with ConstraintError about locked keyrack. tests that start (even if they fail later with fake keys) prove passthrough works.

### edgey paths edge case: absent key output might be unhelpful

**concern:** what if absent keys show no actionable hint?

**why it holds:** edgey paths section shows expected output includes `tip: rhx keyrack set --key <KEY_NAME> --env test`. foreman can verify this hint appears in actual output.

## issues found

none. the playtest covers edge cases specific to keyrack.source() integration:
- file deletion verified at exact path
- SDK call verified with exact parameters
- causal chain (unlock → success) proves keyrack delivers keys
- passthrough verified by relock-then-test sequence
- absent key hints verified in edgey paths

## verdict

edge cases are adequately covered:
- 8/8 edge case categories have coverage or valid omission rationale
- 2 omitted scenarios (partial passthrough, prikey passphrase) are keyrack core behavior
- boundaries tested at both ends (zero keys, all keys)
- unusual inputs either covered by prereqs or explicitly out of scope

the playtest focuses on keyrack.source() integration, not keyrack core mechanics. edge cases specific to the integration are covered.
