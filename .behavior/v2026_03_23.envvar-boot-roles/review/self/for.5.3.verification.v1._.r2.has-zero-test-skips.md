# review: has-zero-test-skips

## the question

does the test suite have any `.skip()` or `.only()` that would hide failures?

---

## method

searched for skip patterns in enroll-related test files.

---

## results

### enroll test files (this pr)

| file | `.skip()` | `.only()` | verdict |
|------|-----------|-----------|---------|
| `parseBrainCliEnrollmentSpec.test.ts` | 0 | 0 | clean |
| `computeBrainCliEnrollment.integration.test.ts` | 0 | 0 | clean |
| `genBrainCliConfigArtifact.integration.test.ts` | 0 | 0 | clean |
| `invokeEnroll.integration.test.ts` | 0 | 0 | clean |

**all enroll tests run without skips.**

### prior skips (not from this pr)

three skips found in unrelated files:
- `src/contract/cli/invokeRun.integration.test.ts:336` — `.skip()`
- `src/domain.operations/weave/enweaveOneFanout.integration.test.ts:111` — `.only()`
- `src/domain.operations/invoke/addAttemptQualifierToOutputPath.test.ts:118` — `.skip()`

these are outside the scope of this pr's changes.

---

## conclusion

**no skips in enroll tests.**

all 49 enroll-related tests execute without skip or only markers.

prior skips in unrelated files are not blockers for this pr.
