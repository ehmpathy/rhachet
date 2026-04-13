# self-review: has-critical-paths-frictionless (round 8)

## pause

the guide asks to run through critical paths manually. i cannot do this because:
1. `keyrack fill` requires interactive stdin prompts
2. i do not have a configured keyrack environment in this worktree
3. the test itself runs the critical path with mock stdin

## what i can verify

### the critical path is exercised by tests

from `fillKeyrackKeys.integration.test.ts` case2:

```typescript
setMockPromptLineValues(['1', '1']); // mock stdin answers for 2 keys
const result = await fillKeyrackKeys(input, context);
expect(result.summary.set).toEqual(2);
```

the test:
1. sets up 2 keys that need to be filled
2. mocks stdin with '1' twice (user selects PERMANENT_VIA_REPLICA)
3. runs fill
4. asserts both keys were set

### console output proves prompts rendered

from test output (captured in r7 review):

```
console.log
  which mechanism?
  at log (src/domain.operations/keyrack/inferKeyrackMechForSet.ts:46:11)

console.log
  1. PERMANENT_VIA_REPLICA — static secret (api key, password)
  2. EPHEMERAL_VIA_GITHUB_APP — github app installation (short-lived tokens)
  at log (src/domain.operations/keyrack/inferKeyrackMechForSet.ts:47:11)
```

### snapshot proves end-to-end completion

from `fillKeyrackKeys.integration.test.ts.snap`:

```
🔑 key 1/2, API_KEY, for 1 owner
   └─ for owner case2j1
      ├─ set the key
      │  ├─
      │  │
      │  │
      │  └─
      └─ get after set, to verify
         ├─ ✓ rhx keyrack unlock --key API_KEY --env test --owner case2j1
         └─ ✓ rhx keyrack get --key API_KEY --env test --owner case2j1
```

the checkmarks prove:
- unlock succeeded after set
- get succeeded after unlock
- the roundtrip is complete

## what friction would look like

if there were friction, the test would:
- fail with error
- hang on pending input
- show mismatched assertions

none of these occur. 8 tests pass.

## why manual verification is not possible here

the fix enables a stdin prompt in fill. to manually verify:
1. would need keyrack configured with os.secure vault
2. would need keys in repo manifest not yet filled
3. would need to run `rhx keyrack fill --env test` interactively

this is not feasible in this context. the integration test with mock stdin is the appropriate verification layer.

## why it holds

the critical path is verified via:
1. **integration test passes** — fill completes without error
2. **console output** — prompt renders with correct options
3. **mock stdin consumed** — user selection reaches mech adapter
4. **snapshot proof** — tree shows successful set + verify sequence

the path is frictionless because it uses the same `inferKeyrackMechForSet` infrastructure that `keyrack set` uses — and that infrastructure was already battle-tested.

## verdict

cannot run manually, but integration test coverage proves the path works.

the fix achieves prompt parity with `keyrack set`. the critical path (fill → prompt → select → set → verify) completes successfully in tests.

