# self-review r5: behavior-declaration-coverage

fresh eyes. trace every requirement to implementation.

---

## behavior declaration sources

| source | path |
|--------|------|
| wish | `0.wish.md` |
| vision | `1.vision.stone` |
| criteria | `2.1.criteria.blackbox.stone`, `2.2.criteria.blackbox.matrix.stone` |
| blueprint | `3.3.1.blueprint.product.stone` |

---

## requirements from vision

### V1: returns profile name (exid)

> "it should just set AWS_PROFILE"

**implementation:**
```ts
// vaultAdapterAwsConfig.ts:187-188
// return profile name (AWS SDK derives credentials from profile)
return source;
```

**test:**
```ts
// vaultAdapterAwsConfig.test.ts:168-175
then('returns the exid (profile name), not credentials', async () => {
  const result = await vaultAdapterAwsConfig.get({
    slug: 'acme.prod.AWS_PROFILE',
    exid: 'acme-prod',
    mech: 'EPHEMERAL_VIA_AWS_SSO',
  });
  expect(result).toEqual('acme-prod');
});
```

**verdict:** covered

### V2: does not return JSON credentials

> "setting AWS_PROFILE to a JSON string containing credentials instead of the profile name"

**implementation:**

before fix:
```ts
const { secret } = await mechAdapter.deliverForGet({ source });
return secret;  // returned JSON credentials
```

after fix:
```ts
await mechAdapter.deliverForGet({ source });
return source;  // returns profile name
```

the `secret` variable is no longer returned. test asserts `expect(result).toEqual('acme-prod')` — a string, not JSON.

**verdict:** covered

### V3: validates SSO session via mech

> "triggers browser login if expired"

**implementation:**
```ts
// vaultAdapterAwsConfig.ts:183-185
// validate sso session via mech (triggers browser login if expired)
const mechAdapter = getMechAdapter(input.mech);
await mechAdapter.deliverForGet({ source });
```

the mech adapter call remains. this triggers `aws configure export-credentials --profile ...` which validates the SSO session and prompts browser login if expired.

**verdict:** covered

---

## requirements from criteria

### usecase.1: get with exid returns profile name

**criteria:**
```
when(user runs `keyrack get --key AWS_PROFILE --env test`)
  given(exid is set to 'ehmpathy.demo')
    then(returns 'ehmpathy.demo')
```

**implementation:** `return source` where `source` equals the exid

**test:** `expect(result).toEqual('acme-prod')`

**verdict:** covered

### usecase.2: get with mech validates session

**criteria:**
```
when(user runs `keyrack get --key AWS_PROFILE --env test`)
  given(mech is EPHEMERAL_VIA_AWS_SSO)
    then(validates SSO session via aws cli)
    then(returns profile name, not credentials)
```

**implementation:** call `mechAdapter.deliverForGet({ source })` then return `source`

**test:** test case `[t0.5] get called with exid and mech` covers this

**verdict:** covered

### usecase.3: no mech returns exid directly

**criteria:**
```
when(user runs `keyrack get --key AWS_PROFILE --env test`)
  given(no mech specified)
    then(returns exid as-is)
```

**implementation:** early return at line 180: `if (!input.mech) return source`

**test:** test case `[t0] get called with exid` covers this — no mech, returns exid

**verdict:** covered

---

## requirements from blueprint

### B1: single-file change in vaultAdapterAwsConfig.ts

**blueprint:** "single-file fix, minimal diff"

**implementation:** only `vaultAdapterAwsConfig.ts` modified (lines 183-188)

**verdict:** covered

### B2: call mech.deliverForGet for validation side effect

**blueprint:** "call mech.deliverForGet to validate SSO session"

**implementation:**
```ts
const mechAdapter = getMechAdapter(input.mech);
await mechAdapter.deliverForGet({ source });
```

**verdict:** covered

### B3: return exid (profile name) instead of secret

**blueprint:** "return source instead of secret"

**implementation:** `return source;`

**verdict:** covered

### B4: add test for mech case

**blueprint:** "add test case for get with mech"

**implementation:** test case `[t0.5] get called with exid and mech` added

**verdict:** covered

---

## coverage summary

| requirement | source | status |
|-------------|--------|--------|
| V1: returns profile name | vision | covered |
| V2: no JSON credentials | vision | covered |
| V3: validates SSO session | vision | covered |
| UC1: get returns profile name | criteria | covered |
| UC2: mech validates session | criteria | covered |
| UC3: no mech returns exid | criteria | covered |
| B1: single-file change | blueprint | covered |
| B2: call deliverForGet | blueprint | covered |
| B3: return source | blueprint | covered |
| B4: add test | blueprint | covered |

---

## why it holds

**all requirements are implemented.**

1. **traced each requirement to implementation** — every item from vision, criteria, and blueprint has a code reference.

2. **traced each requirement to test** — the new test case covers the primary fix. extant tests cover the no-mech case.

3. **no gaps found** — the fix is minimal and targeted. it addresses exactly what the wish asked for: return profile name, not JSON credentials.

4. **no orphan code** — every line of the change maps to a stated requirement.

the behavior declaration is fully covered by the implementation.

