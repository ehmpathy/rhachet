# self-review r4: has-questioned-assumptions

a junior recently modified files in this repo. we need to carefully review the blueprint for hidden technical assumptions.

---

## assumption 1: the profile name IS the usable secret

**the assumption:** for aws.config vault, the profile name (exid) is the usable secret — no transformation required.

**what if the opposite were true?** then we would need to transform the profile name into credentials (which is what the mech does now).

**evidence:**
- the doc comment at `vaultAdapterAwsConfig.ts:117-124` states: "profile names are 'reference' protection (no secrets touch keyrack)"
- AWS CLI and SDK use the profile name to look up credentials from `~/.aws/config` and SSO cache
- the bug occurs because the mech transforms the profile name INTO credentials (JSON blob), but the caller expects the profile name itself

**verdict:** assumption holds. the profile name is how AWS SDK looks up credentials. the mech transformation is incorrect for this vault type.

---

## assumption 2: no other code depends on the JSON credentials

**the assumption:** callers of `vaultAdapterAwsConfig.get()` expect the profile name, not JSON credentials.

**what if the opposite were true?** then some caller might break after the fix.

**evidence:**
- the wish shows the bug: AWS_PROFILE is set to JSON, which breaks `aws s3 ls`
- AWS_PROFILE should contain a profile name, not JSON
- no code should expect JSON from AWS_PROFILE — that's not how AWS works

**verdict:** assumption holds. no code should depend on the buggy behavior.

---

## assumption 3: the mech adapter pattern is correct for other vaults

**the assumption:** removal of `mech.deliverForGet()` from aws.config vault doesn't break the pattern for other vaults.

**what if we broke the pattern for other vaults?** then vaults like os.secure with EPHEMERAL_VIA_GITHUB_APP would fail.

**evidence:**
- the rationale in the blueprint states: "the mech.deliverForGet() pattern is correct for vaults that store a SOURCE credential that requires transformation"
- aws.config is special: the stored value (profile name) IS the usable secret
- other vaults (os.secure) store a source credential (pem file) that requires transformation (→ installation token)

**verdict:** assumption holds. this fix is scoped to aws.config vault only. other vaults correctly use mech transformation.

---

## assumption 4: this is the simplest approach

**the assumption:** the blueprint proposes the simplest fix.

**alternative approaches considered:**

1. **fix in mechAdapterAwsSso.deliverForGet()** — make it return the profile name?
   - no — this would break other callers that need the JSON credentials (e.g., explicit credential extraction)

2. **add a flag to mech.deliverForGet()** — `{ returnRaw: true }`?
   - no — this adds complexity; the vault should decide what to return, not the mech

3. **remove the mech call in vaultAdapterAwsConfig.get()** — the proposed fix
   - yes — cleanest solution; vault returns what it knows is the usable secret

**could a simpler approach work?**
- we could delete more code (the entire mech check block) — the proposed fix does this
- we cannot delete less code and still fix the bug

**verdict:** assumption holds. the proposed fix is the simplest.

---

## assumption 5: the extant test remains valid

**the assumption:** the extant test `when '[t0] get called with exid'` (without mech) is still valid after the fix.

**evidence:**
- the extant test expects `get({ exid: 'acme-prod' })` to return `'acme-prod'`
- the fix returns `source` directly, which is `'acme-prod'`
- the test passes before and after the fix

**verdict:** assumption holds. the extant test is unaffected.

---

## assumption 6: one new test case is sufficient

**the assumption:** one test case for `get() with mech` is sufficient coverage.

**what if we need more test cases?** edge cases:
- mech is undefined vs not supplied → both covered by extant test (no mech supplied)
- exid is null with mech supplied → returns null (covered by extant case1)

**verdict:** assumption holds. the new test covers the specific buggy path.

---

## assumption 7: no acceptance test changes needed

**the assumption:** no acceptance test changes are needed for this fix.

**evidence:**
- the blueprint does not mention acceptance test changes
- the bug is in a low-level vault adapter, not a CLI command
- if acceptance tests snapshot the output, they would have captured the buggy JSON and would now need updates — but this is expected

**verdict:** needs verification in execution phase. not a blocker for the blueprint.

---

## summary

| assumption | verdict | action |
|------------|---------|--------|
| profile name IS the usable secret | holds | none |
| no other code depends on JSON | holds | none |
| mech pattern correct for other vaults | holds | none |
| this is the simplest approach | holds | none |
| extant test remains valid | holds | none |
| one new test case is sufficient | holds | none |
| no acceptance test changes needed | verify in execution | none |

**no blocker issues found.** the blueprint is based on sound technical assumptions with evidence from the codebase and AWS documentation (profile name as the credential reference).
