# self-review r2: has-questioned-deletables

try hard to delete before you optimize.

---

## features in the blueprint

### feature 1: remove mech.deliverForGet() call

**question:** does this trace to a requirement?

**answer:** yes — the wish says "keyrack is set AWS_PROFILE to a JSON string" and "it should just set AWS_PROFILE". the bug is caused by the mech call that transforms the profile name into JSON credentials. this deletion IS the fix.

**delete?** no — this is the core fix. cannot be removed.

---

### feature 2: new test case for get() with mech supplied

**question:** did the wisher explicitly ask for this?

**answer:** no — the wisher did not mention tests. however, tests are required for any code change per blueprint stone guidance.

**question:** is this test necessary?

**answer:** yes — without this test:
- the fix could regress undetected
- the behavior change is not documented
- the extant test only covers get() WITHOUT mech
- the bug specifically occurs when mech IS supplied

**question:** could we use the extant test instead?

**answer:** no — the extant test at `vaultAdapterAwsConfig.test.ts:140-149` tests get() without mech. it passes before AND after the fix. it does not cover the buggy path.

**delete?** no — the test is minimal and necessary.

---

## components in the blueprint

### component 1: vaultAdapterAwsConfig.ts

**question:** can this be removed entirely?

**answer:** no — this is the file that contains the bug. we must modify it.

**question:** is the change minimal?

**answer:** yes — we delete 6 lines and keep 2. the after code is simpler than the before code:

```ts
// before: 10 lines
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;
  if (!input.mech) return source;
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;
},

// after: 4 lines
get: async (input) => {
  const source = input.exid ?? null;
  return source;
},
```

**question:** did we optimize code that shouldn't exist?

**answer:** no — the fix is pure deletion. we removed the mech transformation path because aws.config vault doesn't need it.

---

### component 2: vaultAdapterAwsConfig.test.ts

**question:** can this test file change be removed?

**answer:** no — we need to add a test case. the file must be modified.

**question:** is the test minimal?

**answer:** yes — one test case with one assertion:

```ts
when('[t0.5] get called with exid AND mech', () => {
  then('returns the exid as the profile name (ignores mech)', async () => {
    const result = await vaultAdapterAwsConfig.get({
      slug: 'acme.prod.AWS_PROFILE',
      exid: 'acme-prod',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
    });
    expect(result).toEqual('acme-prod');
  });
});
```

---

## simplest version check

**question:** what is the simplest version that works?

**answer:** the blueprint proposes the simplest version:
1. delete the mech transformation code (6 lines removed)
2. add one test case to verify the fix

there is no simpler version that:
- fixes the bug
- verifies the fix
- prevents regression

---

## summary

**no issues found.** the blueprint is already minimal:

1. **the fix is a deletion** — we remove 6 lines, not add complexity
2. **the test is one case** — minimal coverage for the changed behavior
3. **no features added** — we do not add functionality, only fix a bug
4. **no over-design** — no abstractions, no refactors, no nice-to-haves

the simplest possible fix is: delete the mech call, return the profile name directly. the blueprint proposes exactly that.
