# review: has-preserved-test-intentions

## question

did you preserve test intentions?

for every test you touched:
- what did this test verify before?
- does it still verify the same behavior after?
- did you change what the test asserts, or fix why it failed?

## review

reviewed: 2026-04-04

### step 0: verification via git diff

ran `git diff origin/main -- src/domain.operations/keyrack/setKeyrackKey.test.ts | head -60`:

```diff
-          mockAdapter.set = jest.fn();
+        const mockAdapter = genMockVaultAdapter({
+          supportedMechs: ['EPHEMERAL_VIA_AWS_SSO'],
+        });
```

confirmed: the diff shows removal of override, not removal of test intent.

### step 1: inventory of test files touched

| file | change type |
|------|-------------|
| setKeyrackKey.test.ts | modified mocks, renamed vault references |
| vaultAdapterAwsConfig.test.ts | new file (replaces aws.iam.sso tests) |

### step 2: setKeyrackKey.test.ts analysis

#### change 1: removed `mockAdapter.set = jest.fn()`

**before:**
```ts
const mockAdapter = genMockVaultAdapter();
mockAdapter.set = jest.fn();  // returns undefined
```

**after:**
```ts
const mockAdapter = genMockVaultAdapter();
// uses genMockVaultAdapter's built-in mock which returns { mech }
```

**intention preserved?** YES.

- **what did test verify before:** setKeyrackKey delegates to vault adapter correctly
- **what does test verify after:** same — delegates correctly
- **why this is not weakened:** the mock override CAUSED test failures. `genMockVaultAdapter()` already provides the correct mock implementation. the override replaced a correct mock with an incorrect one (returned undefined instead of `{ mech }`).

#### change 2: renamed 'aws.iam.sso' to 'aws.config'

**before:**
```ts
'aws.iam.sso': genMockVaultAdapter(),
vault: 'aws.iam.sso',
```

**after:**
```ts
'aws.config': genMockVaultAdapter(),
vault: 'aws.config',
```

**intention preserved?** YES.

- **what did test verify before:** aws vault integration works
- **what does test verify after:** same — aws vault integration works
- **why this is valid:** vault was renamed per blueprint. all references updated consistently. same behavior tested.

#### change 3: added `supportedMechs` to mock adapter

**before:**
```ts
const mockAdapter = genMockVaultAdapter();
```

**after:**
```ts
const mockAdapter = genMockVaultAdapter({
  supportedMechs: ['EPHEMERAL_VIA_AWS_SSO'],
});
```

**intention preserved?** YES.

- **what did test verify before:** exid passes through correctly
- **what does test verify after:** same — exid passes through correctly
- **why this is not weakened:** the new interface requires `mechs.supported`. this addition to the mock enables the test to exercise the same codepath. test intention unchanged.

### step 3: vaultAdapterAwsConfig.test.ts analysis

this file tests the renamed vault adapter. verified by comparing to original file on main branch:

```bash
git show origin/main:src/.../aws.iam.sso/vaultAdapterAwsIamSso.test.ts | tail -100
```

#### change 1: assertions now include `mech` field

**before (from aws.iam.sso/vaultAdapterAwsIamSso.test.ts on main):**
```ts
.resolves.toEqual({ exid: 'acme-prod' });
```

**after:**
```ts
.resolves.toEqual({
  exid: 'acme-prod',
  mech: 'EPHEMERAL_VIA_AWS_SSO',
});
```

**intention preserved?** YES — STRENGTHENED.

- **what did test verify before:** set returns exid
- **what does test verify after:** set returns exid AND mech
- **why this is not weakened:** this is the opposite. the assertion is now MORE specific. we verify that:
  1. correct exid is returned (same as before)
  2. correct mech is returned (NEW verification)

the interface contract changed:
- **old contract:** `vault.set() → { exid? }`
- **new contract:** `vault.set() → { mech, exid? }`

tests must reflect the new contract. the `mech` field addition to assertions is correct.

### step 4: check for forbidden patterns

| forbidden pattern | found? | explanation |
|-------------------|--------|-------------|
| weaken assertions to make tests pass | NO | assertions were strengthened (added mech) |
| remove test cases that "no longer apply" | NO | no test cases removed; vault tests preserved |
| change expected values to match broken output | NO | expected values reflect new contract, not broken output |
| delete tests that fail instead of fix code | NO | no tests deleted; code was fixed to match interface |

### step 5: hostile perspective

**challenge:** "you changed expected values from `{ exid }` to `{ exid, mech }` — isn't that matched broken output?"

**response:** NO. the interface contract changed by design:
- vision document specifies `vault.set() → { mech, exid? }`
- blueprint confirms this interface
- the code was changed to implement this interface
- tests were updated to verify the NEW interface

this is not "broken output" — it is the correct new behavior per specification.

**challenge:** "you removed mock overrides — maybe those overrides tested specific scenarios?"

**response:** the overrides did NOT test specific scenarios. they were:
```ts
mockAdapter.set = jest.fn();
```

this replaced a correct mock (returns `{ mech }`) with an incorrect one (returns undefined). the overrides were bugs in the test setup, not intentional test scenarios.

### step 6: findings articulated

#### non-issue 1: mock override removal holds

**what was found:** tests in setKeyrackKey.test.ts had `mockAdapter.set = jest.fn()` overrides removed.

**why it holds:** the override was a test setup bug, not an intentional test scenario. `genMockVaultAdapter()` provides correct return values. the override replaced correct behavior with incorrect behavior. removal restores correct test setup. assertion unchanged — still verifies delegation works.

#### non-issue 2: vault rename holds

**what was found:** all references to 'aws.iam.sso' changed to 'aws.config'.

**why it holds:** this is a planned rename per vision and blueprint documents. all references updated consistently. the test verifies the same behavior — vault integration works — just with the new canonical name.

#### non-issue 3: mech field addition holds

**what was found:** assertions changed from `{ exid }` to `{ exid, mech }`.

**why it holds:** the interface contract changed by design:
- **old:** `vault.set() → { exid? }`
- **new:** `vault.set() → { mech, exid? }`

this is NOT broken output. this is the correct new interface. the test now verifies MORE than before (both exid and mech). assertions were STRENGTHENED, not weakened.

### conclusion

| file | intention preserved? | rationale |
|------|---------------------|-----------|
| setKeyrackKey.test.ts | YES | mock fixes restore correct setup |
| vaultAdapterAwsConfig.test.ts | YES (strengthened) | new contract verified, mech field added |

**found issues:** 0
**non-issues that hold:** 3

all test intentions preserved. assertions were strengthened, not weakened.

review complete.
