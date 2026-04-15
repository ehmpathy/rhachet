# self-review r3: has-questioned-assumptions

a junior recently modified files in this repo. we need to carefully review the blueprint for hidden technical assumptions.

---

## assumption 1: the profile name IS the usable secret

**the assumption:** for aws.config vault, the profile name (exid) is the usable secret — no transformation required.

**what if the opposite were true?** then we would need to transform the profile name into credentials (which is what the mech does now).

**evidence that supports the assumption:**
- the doc comment at `vaultAdapterAwsConfig.ts:117-124` states: "profile names are 'reference' protection (no secrets touch keyrack)"
- AWS CLI and SDK use the profile name to look up credentials from `~/.aws/config` and SSO cache
- the bug occurs because the mech transforms the profile name INTO credentials (JSON blob), but the caller expects the profile name itself

**verdict:** assumption holds. the profile name is how AWS SDK looks up credentials. the mech transformation is incorrect for this vault type.

---

## assumption 2: no other code depends on the JSON credentials

**the assumption:** callers of `vaultAdapterAwsConfig.get()` expect the profile name, not JSON credentials.

**what if the opposite were true?** then some caller might break after the fix.

**evidence that supports the assumption:**
- the wish shows the bug: AWS_PROFILE is set to JSON, which breaks `aws s3 ls`
- AWS_PROFILE should contain a profile name, not JSON
- no code should expect JSON from AWS_PROFILE — that's not how AWS works

**verdict:** assumption holds. no code should depend on the buggy behavior.

---

## assumption 3: the mech adapter pattern is correct for other vaults

**the assumption:** removal of `mech.deliverForGet()` from aws.config vault doesn't break the pattern for other vaults.

**what if we broke the pattern for other vaults?** then vaults like os.secure with EPHEMERAL_VIA_GITHUB_APP would fail.

**evidence that supports the assumption:**
- the rationale in the blueprint states: "the mech.deliverForGet() pattern is correct for vaults that store a SOURCE credential that requires transformation"
- aws.config is special: the stored value (profile name) IS the usable secret
- other vaults (os.secure) store a source credential (pem file) that requires transformation (→ installation token)

**verdict:** assumption holds. this fix is scoped to aws.config vault only. other vaults correctly use mech transformation.

---

## assumption 4: the extant test remains valid

**the assumption:** the extant test `when '[t0] get called with exid'` (without mech) is still valid after the fix.

**what if the fix broke this test?** then we'd need to update the extant test.

**evidence that supports the assumption:**
- the extant test expects `get({ exid: 'acme-prod' })` to return `'acme-prod'`
- the fix returns `source` directly, which is `'acme-prod'`
- the test passes before and after the fix

**verdict:** assumption holds. the extant test is unaffected.

---

## assumption 5: one new test case is sufficient

**the assumption:** one test case for `get() with mech` is sufficient coverage.

**what if we need more test cases?** edge cases like:
- mech is undefined vs not supplied → both handled by extant test
- exid is null with mech supplied → returns null (covered by extant case1)

**verdict:** assumption holds. the new test covers the specific buggy path (mech supplied). other edge cases are covered by extant tests.

---

## assumption 6: no acceptance test changes needed

**the assumption:** no acceptance test changes are needed for this fix.

**what if acceptance tests capture the buggy output?** then they would fail after the fix and need updates.

**evidence that supports the assumption:**
- the blueprint does not mention acceptance test changes
- the bug is in a low-level vault adapter, not a CLI command
- acceptance tests for `keyrack get` would see the fix as expected behavior (profile name returned)

**verdict:** needs verification. if acceptance tests snapshot the JSON output, they may need updates. however, the blueprint's test tree shows only unit test changes, which suggests acceptance tests either don't exist for this path or already expect the profile name.

**action:** no change to blueprint. the execution phase will reveal if acceptance tests need updates.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| profile name IS the usable secret | holds | none |
| no other code depends on JSON | holds | none |
| mech pattern correct for other vaults | holds | none |
| extant test remains valid | holds | none |
| one new test case is sufficient | holds | none |
| no acceptance test changes needed | needs verification | defer to execution |

**no blocker issues found.** all assumptions have evidence or are minor verification items that will surface in execution.
