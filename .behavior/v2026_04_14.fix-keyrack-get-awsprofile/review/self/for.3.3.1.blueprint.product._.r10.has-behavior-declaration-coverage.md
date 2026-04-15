# self-review r10: has-behavior-declaration-coverage

a junior recently modified files in this repo. we need to carefully review that the blueprint covers all behavior declaration requirements.

---

## wish requirements

from `0.wish.md`:

| requirement | description |
|-------------|-------------|
| R1 | keyrack get for AWS_PROFILE should return profile name, not JSON credentials |
| R2 | user stated: "it should just set AWS_PROFILE" |

---

## vision requirements

from `1.vision.yield.md`:

| requirement | description |
|-------------|-------------|
| V1 | before: returns `'{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4",...}'` |
| V2 | after: returns `ehmpathy.demo` (profile name) |
| V3 | `export AWS_PROFILE=$(rhx keyrack get ...)` should work with aws cli |
| V4 | proposed fix: `vaultAdapterAwsConfig.get()` returns exid directly |
| V5 | mech.deliverForGet should NOT be called for aws.config vault |

---

## blueprint coverage check

from `3.3.1.blueprint.product.yield.md`:

### R1: return profile name, not JSON credentials

**blueprint declares:**
```ts
// after
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

**verdict:** R1 is covered. the fix returns `input.exid` (profile name) directly.

### R2: "it should just set AWS_PROFILE"

**blueprint declares:**
- removes the mech check and deliverForGet call
- returns the profile name for any input (with or without mech)

**verdict:** R2 is covered. AWS_PROFILE gets the profile name.

### V1 & V2: before/after behavior

**blueprint declares:**

| aspect | before | after |
|--------|--------|-------|
| code | 6 lines with mech check | 3 lines, direct return |
| output | JSON blob (via deliverForGet) | profile name (exid) |

**verdict:** V1 and V2 are covered. the code change matches the declared before/after.

### V3: aws cli compatibility

**analysis:** if `keyrack get` returns `ehmpathy.demo`, then:
```bash
export AWS_PROFILE=$(rhx keyrack get --key AWS_PROFILE --env test --silent)
# AWS_PROFILE=ehmpathy.demo
```

this is compatible with aws cli (profile name, not JSON).

**verdict:** V3 is covered by the fix.

### V4: fix location

**vision declares:**
> `vaultAdapterAwsConfig.get()` — for aws.config vault, always return the profile name (exid)

**blueprint declares:**
```
src/domain.operations/keyrack/adapters/vaults/aws.config/
├── [~] update vaultAdapterAwsConfig.ts      # remove mech.deliverForGet call in get()
```

**verdict:** V4 is covered. the fix is in the declared location.

### V5: no mech.deliverForGet

**vision declares:**
> the mech.deliverForGet call exists for other vaults that store source credentials that require transformation

**blueprint declares:**
- `[-] delete: mech check and deliverForGet call`

**verdict:** V5 is covered. the mech call is deleted.

---

## test coverage check

**blueprint declares one new test:**
```
when '[t0.5] get called with exid AND mech'
then 'returns the exid as the profile name (ignores mech)'
```

**analysis:**
- tests the exact bug path: mech supplied → should return profile name
- extant tests cover: no exid → null, exid without mech → profile name
- new test covers: exid with mech → profile name (the fix)

**verdict:** test coverage is sufficient for the fix.

---

## summary

| requirement | covered | how |
|-------------|---------|-----|
| R1: return profile name | yes | returns exid directly |
| R2: "just set AWS_PROFILE" | yes | no transformation, direct return |
| V1: before behavior | yes | code matches |
| V2: after behavior | yes | code matches |
| V3: aws cli compat | yes | profile name works with cli |
| V4: fix location | yes | vaultAdapterAwsConfig.ts |
| V5: no deliverForGet | yes | mech call deleted |
| test coverage | yes | new test for mech path |

---

## why it holds

**all behavior declaration requirements are covered.** articulation:

1. **wish is satisfied** — the blueprint returns the profile name directly, not JSON credentials. this is exactly what the wish requested: "it should just set AWS_PROFILE".

2. **vision before/after is implemented** — the code change matches the before (6 lines with mech call) and after (3 lines with direct return) declared in the vision.

3. **proposed fix location is honored** — the blueprint modifies `vaultAdapterAwsConfig.get()` as proposed in the vision.

4. **mech transformation is removed** — the blueprint deletes the mech check and deliverForGet call. the aws.config vault now returns the profile name directly.

5. **test covers the bug path** — the new test verifies that get() with mech supplied still returns the profile name, not the transformed JSON.

the blueprint fully covers all requirements from the wish and vision.
