# self-review: has-preserved-test-intentions (round 3)

## pause

i ran `git diff main -- src/domain.operations/keyrack/fillKeyrackKeys.integration.test.ts` to see what changed.

## tests touched

only one keyrack test file changed: `fillKeyrackKeys.integration.test.ts`

## what changed

### additions

1. **new imports**: `genMockPromptLineInput`, `setMockPromptLineValues` for mech selection
2. **new mock**: `jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput());`
3. **mock setup in each test**: `setMockPromptLineValues(['1', '1'])` before fill calls

### what stayed the same

every test assertion remains identical:

| test case | assertion | preserved? |
|-----------|-----------|------------|
| sets all 2 keys | `result.report[0].status === 'already-set'` pattern | yes |
| sets key for 2 owners | checks both owners got key | yes |
| --refresh re-sets | verifies refresh behavior | yes |
| refresh with 2 owners | checks both owners refreshed | yes |
| env=prod with org | verifies org-scoped storage | yes |

## before vs after

| aspect | before | after |
|--------|--------|-------|
| fill called set() | with mech: null (default) | with mech from prompt |
| test setup | only secret prompts mocked | secret + mech prompts mocked |
| assertions | check fill results | check fill results (unchanged) |
| behavior verified | keys get stored | keys get stored (unchanged) |

## the question: changed what or fixed why?

the tests changed **setup** to accommodate the new prompt, not **assertions** about behavior.

- setup changed: add mech prompt mock values
- assertions unchanged: same checks for fill results

this is "fix why it failed" — the fix enabled the mech prompt, so tests need to answer that prompt.

## why this is correct

the tests verify: "fill stores keys in vault"

that intention is preserved. the mech selection is infrastructure (how vault.set acquires the secret), not the behavior under test (keys get stored).

## verdict

tests preserve their intentions:
- all assertions unchanged
- setup additions enable new prompt, do not bypass behavior
- no test weakened or removed

