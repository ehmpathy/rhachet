# self-review r7: has-thorough-test-coverage

a junior recently modified files in this repo. we need to carefully review the blueprint for thorough test coverage declaration.

---

## the blueprint's test coverage declaration

from `3.3.1.blueprint.product.yield.md`:

### coverage by layer

| layer | scope | test type | file |
|-------|-------|-----------|------|
| communicator | vaultAdapterAwsConfig.get() | unit (mocked) | vaultAdapterAwsConfig.test.ts |

### coverage by case

| case | type | description |
|------|------|-------------|
| no exid | negative | returns null |
| exid without mech | positive | returns exid (profile name) |
| exid with mech | positive | returns exid (profile name) — NEW TEST |

### test tree

```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── vaultAdapterAwsConfig.ts
└── [~] update vaultAdapterAwsConfig.test.ts
    └── [+] create: given '[case2] exid provided'
                    when '[t0.5] get called with exid AND mech'
                    then 'returns the exid as the profile name (ignores mech)'
```

---

## review by layer

### question: is the layer classification correct?

the blueprint classifies `vaultAdapterAwsConfig.get()` as a "communicator."

**analysis:**

per the grain definitions:
- **communicator** = raw i/o boundary (SDK, DAO, service calls)
- **transformer** = pure computation, format conversion
- **orchestrator** = composition of transformers + communicators

the `get()` method after the fix:
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← no I/O, pure logic
},
```

this is pure computation — it extracts `exid` from input and returns it. there is no I/O.

**verdict:** the classification as "communicator" is imprecise. `get()` is more like a transformer (pure). however, the vault adapter as a whole contains I/O in other methods (`set`, `unlock`). the "unit (mocked)" test type is appropriate for this specific method.

**action:** no change needed. the test type (unit) is correct for the `get()` method.

---

### question: does the test type match the layer?

per the guide:
- transformers → unit tests
- communicators → integration tests

the blueprint declares "unit (mocked)" for `get()`.

**analysis:**
- `get()` after the fix is pure logic (no I/O)
- unit test is appropriate for pure logic
- no mock is actually needed — the method does not call external dependencies

**verdict:** test type is appropriate. unit test for pure logic.

---

## review by case

### question: are positive cases declared?

| positive case | declared? |
|---------------|-----------|
| exid without mech → profile name | yes (prior test) |
| exid with mech → profile name | yes (NEW TEST) |

**verdict:** positive cases are declared.

---

### question: are negative cases declared?

| negative case | declared? |
|---------------|-----------|
| no exid → null | yes (prior test) |

**verdict:** negative cases are declared.

---

### question: is the happy path covered?

the happy path is: caller calls `get({ exid: 'profile-name', mech: 'EPHEMERAL_VIA_AWS_SSO' })` → returns `'profile-name'`.

this is exactly what the NEW TEST covers.

**verdict:** happy path is covered.

---

### question: are edge cases covered?

| edge case | covered? | by which test? |
|-----------|----------|----------------|
| empty string exid | **no** | (not declared) |
| null exid | yes | prior test `[case1]` |
| undefined mech | yes | prior test `[t0] get called with exid` |

**issue found:** empty string exid is not covered.

**analysis:**
- if exid is `''`, the code returns `''` (falsy but not null)
- is this the correct behavior?

per the code:
```ts
const source = input.exid ?? null;
return source;
```

if `exid = ''`, then `source = ''` (empty string is not nullish), so we return `''`.

**question:** should empty string be treated as absent?

**verdict:** this is an edge case not addressed by the wish. the wish is about mech transform, not input validation. the current behavior (return empty string) is acceptable. we do not need to add a test for this edge case unless the wish requests it.

**action:** no change needed. edge case is out of scope.

---

## review by snapshot

### question: does the blueprint declare snapshots?

the guide says acceptance tests MUST snapshot contract stdouts.

**analysis:**
- `vaultAdapterAwsConfig` is not a contract (cli, api, sdk entry point)
- it is a domain operation (vault adapter)
- acceptance tests are not required for domain operations

**verdict:** snapshots not required. this is not a contract layer.

---

## review by test tree

### question: does the test tree show the right structure?

the blueprint declares:
```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── vaultAdapterAwsConfig.ts
└── [~] update vaultAdapterAwsConfig.test.ts
    └── [+] create: given '[case2] exid provided'
                    when '[t0.5] get called with exid AND mech'
                    then 'returns the exid as the profile name (ignores mech)'
```

**verification:**
- test file location: `vaultAdapterAwsConfig.test.ts` — matches convention (collocated)
- test structure: given/when/then — matches convention
- test file action: `[~] update` — correct (not create)

**verdict:** test tree is correct.

---

## devil's advocate: what could be absent?

### what if we need integration tests too?

**hypothesis:** vault adapters should have integration tests that verify real I/O.

**analysis:**
- vault adapter has `set`, `unlock`, and `get` methods
- `set` and `unlock` perform real I/O (write to filesystem)
- `get` after the fix is pure — no I/O
- the fix only touches `get()`

**verdict:** integration tests for `get()` are not needed because the method is pure after the fix. if we were to modify `set` or `unlock`, we would need integration tests.

### what if the test name is wrong?

**hypothesis:** `[t0.5]` is a bad test name — looks like a version number.

**analysis:**
- `[t0.5]` indicates this test sits between `[t0]` (no mech) and `[t1]` (a future test)
- this is an insertion into an extant test suite
- the name preserves numeric order without renumber of other tests

**verdict:** `[t0.5]` is acceptable for an insertion. not ideal, but not a blocker.

### what if we need to test all mech types?

**hypothesis:** we should test with each `KeyrackSecretMech` enum value.

**analysis:**
- the fix removes the mech check entirely: `get()` ignores mech
- one test proves "mech is ignored"
- test with different mechs would all have the same assertion
- that would be redundant

**verdict:** one test with one mech value is sufficient to prove mech is ignored.

---

## summary

| coverage aspect | status | action |
|-----------------|--------|--------|
| layer classification | communicator (imprecise) | acceptable for this method |
| test type | unit (correct) | none |
| positive cases | declared | none |
| negative cases | declared | none |
| happy path | covered | none |
| edge cases | out of scope | none |
| snapshots | not required | none |
| test tree | correct | none |

---

## why it holds

**test coverage is thorough.** articulation:

1. **test type matches the method** — `get()` is pure logic after the fix. unit test is appropriate.

2. **positive and negative cases are declared** — the blueprint covers both "exid present" and "exid absent."

3. **happy path is explicitly covered** — the NEW TEST covers the exact bug path: mech supplied → return profile name.

4. **edge cases are out of scope** — the wish is about mech transform, not input validation. empty string exid is not addressed by the wish.

5. **snapshots not required** — vault adapters are domain operations, not contracts. acceptance tests are required only for contracts (cli, api, sdk).

6. **test tree follows convention** — collocated test file, given/when/then structure.

7. **single mech test is sufficient** — the fix ignores mech entirely. one test proves the behavior. more mech variants would be redundant.

8. **integration tests not needed** — `get()` after the fix is pure. no I/O means no integration test requirement.

the blueprint declares sufficient test coverage for the bug fix.
