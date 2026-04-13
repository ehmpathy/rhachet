# self-review: has-preserved-test-intentions (round 4)

## pause

i ran `git diff main -- src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts` and reviewed each change.

## test file analyzed

`fillKeyrackKeys.integration.test.ts` — the only keyrack test file touched.

## what i verified

### for every test touched

| test name | verified before | verified after | assertion changed? |
|-----------|----------------|----------------|-------------------|
| sets all 2 keys via prompts | fill stores 2 keys | fill stores 2 keys | no |
| sets key for both owners | fill handles 2 owners | fill handles 2 owners | no |
| --refresh re-sets | refresh overwrites | refresh overwrites | no |
| refresh with 2 owners | refresh for each owner | refresh for each owner | no |
| env=prod stores under org | org-scoped storage | org-scoped storage | no |

### what changed vs what stayed

**changed**: setup (mock infrastructure)
- added `genMockPromptLineInput`, `setMockPromptLineValues` imports
- added `jest.mock('@src/infra/promptLineInput', ...)`
- added `setMockPromptLineValues(['1', '1'])` before fill calls

**unchanged**: every `expect()` assertion
- no expected values changed
- no assertions removed
- no test cases deleted

### the critical question

did i change **what** the test asserts, or fix **why** it failed?

i changed **why** it failed:
- before: tests passed because fill defaulted mech to PERMANENT_VIA_REPLICA
- after: tests pass because fill prompts for mech, mock answers '1' (PERMANENT_VIA_REPLICA)

the test intention remains: "verify fill stores keys in vault"

### forbidden patterns check

| forbidden pattern | found? | evidence |
|-------------------|--------|----------|
| weaken assertions to make tests pass | no | all `expect()` calls identical |
| remove test cases that "no longer apply" | no | all 8 test cases preserved |
| change expected values to match broken output | no | expected values unchanged |
| delete tests that fail instead of fix code | no | zero tests removed |

## why it holds

the test intentions are preserved because:

1. **the tests still verify the same behavior** — fill stores keys in vault
2. **the fix addressed why tests would fail** — mech prompt needs answer
3. **no assertions weakened** — all expect() calls unchanged
4. **no test cases removed** — all 8 cases present

the mech prompt mock is legitimate test infrastructure — same category as the stdin mock for secret entry that was already present.

## verdict

test intentions preserved. setup adapted for new prompt, assertions unchanged.

