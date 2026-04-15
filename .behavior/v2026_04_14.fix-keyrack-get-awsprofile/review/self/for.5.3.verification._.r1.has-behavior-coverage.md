# self-review r1: has-behavior-coverage

## the check

does the verification checklist show every behavior from wish/vision has a test?

## the wish behavior

from `0.wish.md`:
> keyrack sets AWS_PROFILE to a JSON string with credentials instead of the profile name

the fix requirement:
> it should just set AWS_PROFILE (the profile name, not credentials JSON)

## test coverage

| behavior | test file | test case | covered? |
|----------|-----------|-----------|----------|
| keyrack get returns profile name, not credentials JSON | vaultAdapterAwsConfig.test.ts | [t0.5] get called with exid and mech → returns the exid (profile name), not credentials | ✅ |

## why it holds

1. **test exists** — `[t0.5]` in vaultAdapterAwsConfig.test.ts directly tests the fixed behavior

2. **test assertion is correct** — the test calls `vaultAdapterAwsConfig.get({ slug, exid: 'acme-prod', mech: 'EPHEMERAL_VIA_AWS_SSO' })` and asserts `expect(result).toEqual('acme-prod')` — this proves the profile name is returned, not a JSON blob

3. **test passes** — unit tests ran and passed (22 tests in 1s)

4. **prod code implements the fix** — lines 186-190 in vaultAdapterAwsConfig.ts:
   ```ts
   const mechAdapter = getMechAdapter(input.mech);
   await mechAdapter.deliverForGet({ source });
   // return profile name (AWS SDK resolves credentials from profile)
   return source;
   ```
   the code returns `source` (the profile name) directly, not the result of `deliverForGet`

the behavior from the wish is covered by a test that verifies the exact fix.
