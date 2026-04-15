# self-review r4: behavior-declaration-coverage

verify all requirements from the behavior declaration are implemented.

---

## the wish

from `.behavior/v2026_04_14.fix-keyrack-get-awsprofile/0.wish.md`:

```
wish =

  profile: '{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4",...}'

  keyrack is setting AWS_PROFILE to a JSON string containing credentials instead of the
  profile name "ehmpathy.demo".

  The keyrack should either:
  1. Set AWS_PROFILE=ehmpathy.demo (let SDK derive credentials)
  2. Or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN as separate env vars

  This is a keyrack mechanism bug - it's deriving the profile and stuffing all credentials
  into AWS_PROFILE as JSON.

----

we gotta fix that bug

it should just set AWS_PROFILE
```

---

## requirements extracted

| # | requirement | source |
|---|-------------|--------|
| R1 | AWS_PROFILE should be set to profile name (e.g., "ehmpathy.demo") | wish: "it should just set AWS_PROFILE" |
| R2 | AWS_PROFILE should NOT be JSON credentials | wish: "setting AWS_PROFILE to a JSON string...instead of the profile name" |

---

## requirements verification

### R1: AWS_PROFILE should be set to profile name

**implementation check:**

```ts
// vaultAdapterAwsConfig.ts lines 183-188
// validate sso session via mech (triggers browser login if expired)
const mechAdapter = getMechAdapter(input.mech);
await mechAdapter.deliverForGet({ source });

// return profile name (AWS SDK derives credentials from profile)
return source;
```

`source` is the profile name (exid). the function now returns `source` instead of `secret`.

**test verification:**

```ts
// vaultAdapterAwsConfig.test.ts lines 168-176
then('returns the exid (profile name), not credentials', async () => {
  const result = await vaultAdapterAwsConfig.get({
    slug: 'acme.prod.AWS_PROFILE',
    exid: 'acme-prod',
    mech: 'EPHEMERAL_VIA_AWS_SSO',
  });
  expect(result).toEqual('acme-prod');
});
```

**verdict:** ✓ R1 satisfied

### R2: AWS_PROFILE should NOT be JSON credentials

**implementation check:**

before the fix:
```ts
const { secret } = await mechAdapter.deliverForGet({ source });
return secret;  // returns JSON credentials
```

after the fix:
```ts
await mechAdapter.deliverForGet({ source });
return source;  // returns profile name
```

the `secret` variable (which contained JSON credentials) is no longer returned.

**test verification:**

the test description explicitly states "not credentials":
```ts
then('returns the exid (profile name), not credentials', ...
```

and the assertion verifies a profile name string, not JSON:
```ts
expect(result).toEqual('acme-prod');  // not JSON
```

**verdict:** ✓ R2 satisfied

---

## coverage summary

| requirement | status | evidence |
|-------------|--------|----------|
| R1: return profile name | ✓ covered | `return source` in prod, test assertion |
| R2: not JSON credentials | ✓ covered | removed `secret` return, test verifies string |

---

## why it holds

**all requirements from the wish are implemented.**

1. **R1 covered** — the fix returns `source` (profile name) instead of `secret` (credentials JSON). the test verifies `expect(result).toEqual('acme-prod')`.

2. **R2 covered** — the fix removes the return of `secret`. we no longer extract or return the credentials JSON.

3. **SSO validation preserved** — we still call `mechAdapter.deliverForGet({ source })` to validate the session is active. the validation side effect is kept; only the return value changed.

the wish asked for a bug fix, not new features. the fix addresses exactly what was requested: AWS_PROFILE now gets the profile name, not JSON.

