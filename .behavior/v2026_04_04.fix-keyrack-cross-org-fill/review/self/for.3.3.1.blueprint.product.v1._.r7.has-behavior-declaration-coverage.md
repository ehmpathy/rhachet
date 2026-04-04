# self-review r7: has-behavior-declaration-coverage

deeper review with explicit search for omissions.

---

## what could have been omitted?

let me question each part of the behavior declaration.

### question 1: did we test the failure case?

the wish shows roundtrip verification fails with the bug. does the blueprint show:
- the failure path before the fix? **no, but not needed** — the fix changes behavior, the test only needs to verify correct behavior after.
- the success path after the fix? **yes** — `expect(result.summary.failed).toEqual(0)`

✓ coverage sufficient.

### question 2: did we verify the prompt shows correct org?

the wish shows: "enter secret for ahbode.prod..." when it should show "rhight.prod...".

**blueprint coverage**:
```ts
const usptoLog = logCalls.find(
  (l) => typeof l === 'string' && l.includes('rhight.prod.USPTO_ODP_API_KEY'),
);
expect(usptoLog).toBeDefined();
```

✓ the log check verifies the emitted prompt contains the correct org.

### question 3: did we verify BOTH key scenarios?

the vision shows two rows in the usecase table:
- root key (AWS_PROFILE) stays under root org
- extended key (USPTO_ODP_API_KEY) uses extended org

**blueprint coverage**:
```ts
// USPTO_ODP_API_KEY should be under rhight, not ahbode
expect(usptoLog).toBeDefined();

// AWS_PROFILE should be under ahbode
expect(awsLog).toBeDefined();
```

✓ both scenarios verified.

### question 4: did we test with multiple envs?

the vision mentions env.prep and env.prod in the usecase manifest. does the blueprint test both?

**answer**: no, but this is acceptable. the bug is about org extraction, not env. the fix is `slug.split('.')[0]` which extracts org. env is at index 1 and is unchanged. one env is sufficient to verify the fix.

✓ env coverage not required for this fix.

### question 5: did we miss any edge cases from the vision?

the vision's edgecases section lists:
- "key declared in both root and extended" → uses root (extant merge behavior)
- "extended manifest has no org" → fail-fast at hydration

**blueprint coverage**: these are extant behaviors, unchanged by the fix. no test needed.

✓ no edgecase omission.

---

## final answer: why this holds

| requirement | covered | justification |
|-------------|---------|---------------|
| fix at line 257 | ✓ | contracts section shows before/after |
| prompt shows correct org | ✓ | test asserts log contains rhight slug |
| root key uses root org | ✓ | test asserts AWS_PROFILE under ahbode |
| extended key uses extended org | ✓ | test asserts USPTO under rhight |
| roundtrip succeeds | ✓ | test asserts failed=0 |

all requirements covered. no omissions found.

