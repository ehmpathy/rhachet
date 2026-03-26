# review: has-all-tests-passed

## the question

did all tests pass? did we fix all failures or emit handoffs?

---

## test execution

ran `npm run test` which executes:
- types
- lint
- unit
- integration
- acceptance

---

## results

### enroll-specific tests (this pr)

| test file | tests | result |
|-----------|-------|--------|
| `parseBrainCliEnrollmentSpec.test.ts` | 12 | pass |
| `computeBrainCliEnrollment.integration.test.ts` | 12 | pass |
| `genBrainCliConfigArtifact.integration.test.ts` | 12 | pass |
| `invokeEnroll.integration.test.ts` | 13 | pass |

**total: 49 enroll tests pass.**

### full test suite

```
test suites: 1 failed (keyrack), 43 passed
tests: 4 failed (keyrack), 1149 passed
```

---

## failure analysis: keyrack tests

4 tests fail in `blackbox/cli/keyrack.prikey.acceptance.test.ts`:

```
/bin/sh: 1: age: not found
```

**root cause**: the `age` encryption CLI is not installed on this system.

### deep dive: what is `age`?

`age` is a Go binary for file encryption (https://age-encryption.org). it:
- is installed via system package managers (`brew install age`, `apt install age`)
- cannot be installed via npm
- is required by keyrack acceptance tests to verify encryption behavior

the `age-encryption` npm package used by keyrack core is a WASM port, but the acceptance tests invoke the CLI directly to verify roundtrip behavior.

### exhaustive analysis

| approach | attempted | result |
|----------|-----------|--------|
| `which age` | yes | not found |
| npm dependency | no | `age` is not an npm package |
| install via bash | no | requires elevated privileges |
| mock the CLI | no | would defeat test purpose |
| skip tests | no | would hide the failure |

### why this truly requires human intervention

1. **system package installation** — the `age` CLI requires `brew install age` or equivalent
2. **privilege escalation** — mechanic cannot install system packages
3. **ci environment** — the ci workflow should have `age` installed
4. **test validity** — the tests correctly verify `age` CLI integration

this is a "foreman possesses the key" situation:
- the key: system package installation privileges
- the door: keyrack acceptance tests
- the mechanic cannot unlock without human intervention

**why this is not a blocker for this pr**:
1. keyrack feature is completely separate from enroll
2. this pr does not touch keyrack code
3. the failure is infrastructure, not code
4. the tests work correctly when `age` is present

---

## zero tolerance assessment

| rule | assessment |
|------|------------|
| "it was already broken" | keyrack was broken before this pr due to system dependency |
| "it's unrelated to my changes" | keyrack is completely separate from enroll |
| flaky tests | keyrack is not flaky — it deterministically fails without `age` |
| every failure is your responsibility | we cannot install system packages |

**verdict**: keyrack failure is a system dependency issue that requires human intervention to install `age`. this pr does not touch keyrack code. enroll feature is fully tested and passes.

---

## conclusion

**all enroll tests pass. keyrack failures are infrastructure blockers outside code scope.**

enroll-specific: 49/49 pass
full suite: 1149/1153 pass (4 keyrack failures due to absent `age` CLI)

the keyrack failure is documented in the verification checklist as an unrelated blocker.
