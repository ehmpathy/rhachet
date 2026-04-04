# review: has-zero-test-skips

## verdict: pass

## question: did you verify zero skips?

### .skip() and .only() check

searched for `.skip(` and `.only(` in changed test files:
- `src/infra/promptHiddenInput.integration.test.ts` — no matches
- `src/infra/promptVisibleInput.integration.test.ts` — no matches
- `blackbox/cli/keyrack.set.acceptance.test.ts` — no matches

**why this holds**: grep returned no matches for the pattern `\.skip\(|\.only\(` in any of the test files.

### silent credential bypass check

searched for patterns like `bypass`, `mock.*cred`, `skip.*auth`, `disable.*valid`:
- no matches found

**why this holds**: the tests use real stdin via spawn, not mocked credential handlers. no credential bypass patterns detected.

### prior failures carried forward check

searched for `todo`, `fixme`, `xdescribe`, `xit`:
- no matches found (false positive on "exits successfully" which contains "xits")

**why this holds**: no commented-out tests or known failure markers found in changed files.

### summary

| check | result |
|-------|--------|
| no .skip() or .only() | ✓ verified |
| no silent credential bypasses | ✓ verified |
| no prior failures carried forward | ✓ verified |

all tests in changed files run without skips or bypasses.
