# review: has-snapshot-coverage

## the question

do snapshots capture the critical contract outputs for visual verification?

---

## snapshot files

| snapshot file | count | status |
|---------------|-------|--------|
| `invokeEnroll.integration.test.ts.snap` | 3 | new |

---

## snapshot coverage

| journey | contract output | snapshot | status |
|---------|-----------------|----------|--------|
| journey 1: replace | settings.local.json with mechanic only | `journey1-replace-mechanic` | captured |
| journey 2: subtract | settings.local.json without driver | `journey2-subtract-driver` | captured |
| journey 3: typo error | error message with suggestion | `journey3-typo-error` | captured |
| journey 4: passthrough | no distinct output (behavioral) | n/a | verified via test |

---

## snapshot content verification

### journey1-replace-mechanic

captures the generated `settings.local.json` with:
- hooks for mechanic role only
- SessionStart hook structure
- matcher pattern with role identifier

### journey2-subtract-driver

captures the generated `settings.local.json` with:
- hooks for default roles minus driver
- mechanic and ergonomist hooks present
- driver hooks absent

### journey3-typo-error

captures the error message with:
- "role 'mechnic' not found"
- suggestion: "did you mean 'mechanic'?"
- metadata with role and available roles

---

## conclusion

**snapshots cover all distinct contract outputs.**

- success paths: config structure captured (journeys 1, 2)
- error paths: error format captured (journey 3)
- behavioral paths: verified via assertions (journey 4)

snapshots enable visual diff in pr review to verify output quality.
