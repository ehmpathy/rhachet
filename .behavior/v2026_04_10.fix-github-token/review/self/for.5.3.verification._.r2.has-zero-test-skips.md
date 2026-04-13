# self-review: has-zero-test-skips (round 2)

## pause

i read the actual test file: `fillKeyrackKeys.integration.test.ts`

762 lines. 8 test cases. each case runs a real flow.

## what i examined

### line 27-30: mocks

```typescript
jest.mock('@src/infra/promptHiddenInput', () => genMockPromptHiddenInput());
jest.mock('@src/infra/promptLineInput', () => genMockPromptLineInput());
```

these are stdin mocks, not bypass skips. they enable the test to provide predictable input values via `setMockPromptLineValues(['1', '1'])` per test case.

this is legitimate — we cannot type into stdin in automated tests. the mock provides answers; the code under test still runs the full prompt logic:
- checks if `supported.length === 1` before auto-select
- builds the options menu
- validates the choice

### no `.skip()` or `.only()` patterns

searched the file: zero matches.

### no silent credential bypasses

tests use:
- `createTestHomeWithSshKey` — real SSH key for age encryption
- `daoKeyrackHostManifest.set` — real manifest write
- `writeDirectVaultSecret` — real filesystem write to simulate pre-set keys

no bypass — tests exercise the actual vault adapter paths.

### no prior failures carried forward

all tests verified to pass (164 unit, 150 integration in verification yield).

## the 11 files with skips elsewhere

these are in unrelated modules (weave, actor, invoke). they do not import from keyrack. keyrack does not import from them. module trees are disjoint.

## why it holds

1. keyrack tests mock stdin (legitimate) but run real code paths
2. no `.skip()` or `.only()` in keyrack files
3. unrelated module skips do not mask keyrack behavior

## verdict

✓ zero test skips in keyrack tests
✓ stdin mocks are legitimate test infrastructure, not bypasses
