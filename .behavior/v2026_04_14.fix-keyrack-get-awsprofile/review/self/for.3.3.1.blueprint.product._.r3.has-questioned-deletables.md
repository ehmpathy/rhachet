# self-review r3: has-questioned-deletables

try hard to delete before you optimize.

---

## features in the blueprint

the blueprint proposes two changes:
1. remove the mech.deliverForGet() call
2. add a test case for get() with mech supplied

### feature 1: remove mech.deliverForGet() call

**question:** does this trace to a requirement?

**answer:** yes — the wish says "keyrack is set AWS_PROFILE to a JSON string" and "it should just set AWS_PROFILE". the bug is caused by the mech call that transforms the profile name into JSON credentials. this deletion IS the fix.

**question:** can this be deleted?

**answer:** no — this is the core fix. the deletion of the mech call is what fixes the bug.

---

### feature 2: new test case for get() with mech supplied

**question:** did the wisher explicitly ask for this?

**answer:** no — the wisher did not mention tests.

**question:** is this test necessary?

**answer:** yes:
- the extant test covers get() WITHOUT mech — it passes before and after the fix
- the bug occurs when mech IS supplied — that path is untested
- without this test, the fix could regress undetected
- tests are required for code changes per blueprint stone guidance

**question:** could we delete this and still have confidence?

**answer:** no — if we delete the test, we have no verification that the fix works. the extant test does not cover the buggy path.

---

## components in the blueprint

### component 1: vaultAdapterAwsConfig.ts change

**question:** can this file change be removed entirely?

**answer:** no — this file contains the bug. we must modify it.

**question:** is this the simplest change?

**answer:** yes — we delete 6 lines (the mech transformation path). the after code is 4 lines vs 10 lines before. this is net deletion, not addition.

**question:** if we deleted this and had to add it back, would we?

**answer:** no — this IS a deletion. we do not add code that could later be questioned.

---

### component 1a: the retained null check

the blueprint shows:
```
├── [○] retain: null check for exid
```

**question:** should we delete the null check too?

the before code has:
```ts
const source = input.exid ?? null;
if (!source) return null;
```

the after code retains this:
```ts
const source = input.exid ?? null;
return source;  // ← implicitly returns null when exid is null
```

wait — the after code does NOT have an explicit `if (!source) return null;` check. let me re-read the blueprint...

the blueprint says:
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;  // ← fix: always return profile name
},
```

this code handles null implicitly: if `exid` is null/undefined, `source` is null, and we return null. no explicit check needed.

**conclusion:** the blueprint already deleted the explicit null check. the `[○] retain` in the codepath tree refers to the behavior (return null when no exid), not the explicit if statement. this is correct — the behavior is retained, but the code is simpler.

---

### component 2: vaultAdapterAwsConfig.test.ts change

**question:** can this test be removed?

**answer:** no — we need verification that the fix works.

**question:** is this the simplest test?

**answer:** yes — one test case, one assertion:
```ts
expect(result).toEqual('acme-prod');
```

**question:** what is the simplest version that works?

**answer:** the blueprint proposes exactly the simplest version:
- delete the buggy code (6 lines)
- add one test case (9 lines)

---

## summary

**no deletables found.** the blueprint is already minimal:

| component | action | justification |
|-----------|--------|---------------|
| mech.deliverForGet() call | DELETE | this IS the fix |
| new test case | ADD | required to verify the fix |

the fix is a net deletion (6 lines removed, 9 lines added for test). the test is the minimum viable coverage. no features or components can be deleted without a break in the fix or its verification.
