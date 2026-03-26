# review: has-preserved-test-intentions

## the question

for every test touched, did we preserve what the test verifies? did we fix causes, not assertions?

---

## test file analysis

### tests written for this pr (new)

| file | change type | intention preserved? |
|------|-------------|---------------------|
| `parseBrainCliEnrollmentSpec.test.ts` | new | n/a — new tests |
| `computeBrainCliEnrollment.integration.test.ts` | new | n/a — new tests |
| `genBrainCliConfigArtifact.integration.test.ts` | new | n/a — new tests |
| `invokeEnroll.integration.test.ts` | new | n/a — new tests |

all test files for this pr are new. no prior test intentions to preserve.

### tests modified in this pr

**none.** this pr did not modify any prior test files.

---

## snapshot analysis

| snapshot | change type | intention |
|----------|-------------|-----------|
| `invokeEnroll.integration.test.ts.snap` | new | captures journey outputs |

the snapshots are new. they capture:
1. `journey1-replace-mechanic` — config with mechanic only
2. `journey2-subtract-driver` — config without driver
3. `journey3-typo-error` — error message with suggestion

no prior snapshots were modified.

---

## forbidden pattern check

| pattern | detected? | details |
|---------|-----------|---------|
| weaken assertions to pass | no | all assertions test actual behavior |
| remove "no longer applies" cases | no | no test cases removed |
| change expected to match broken | no | all expectations match intent |
| delete tests instead of fix | no | no tests deleted |

---

## conclusion

**test intentions preserved. no prior tests were modified.**

this pr adds new test files and new snapshots. it does not touch prior test code. there are no intention violations.
