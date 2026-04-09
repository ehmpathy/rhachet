# review: has-play-test-convention (r10)

## verdict: complete — no journey tests in this work

this work adds unit and integration tests, not journey tests. the `.play.test.ts` convention does not apply.

---

## verification process

I examined each test file changed in this branch to determine if any are journey tests.

### step 1: list test files changed

```
git diff origin/main --name-only
```

**test files changed:**

| file | path |
|------|------|
| translateHook.test.ts | src/_topublish/rhachet-brains-anthropic/src/hooks/ |
| config.dao.test.ts | src/_topublish/rhachet-brains-anthropic/src/hooks/ |
| config.dao.test.ts | src/_topublish/rhachet-brains-opencode/src/hooks/ |
| genBrainHooksAdapterForClaudeCode.test.ts | src/_topublish/rhachet-brains-anthropic/src/hooks/ |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | src/domain.operations/brains/ |

### step 2: examine each test file

**syncOneRoleHooksIntoOneBrainRepl.test.ts** (lines 49-233):

```typescript
describe('syncOneRoleHooksIntoOneBrainRepl', () => {
  given('[case1] role with onBoot hooks, empty config', () => { ... });
  given('[case2] role removes a prior hook', () => { ... });
  given('[case3] role with no hooks', () => { ... });
  given('[case4] role with onTalk hooks', () => { ... });  // new test
});
```

these are integration tests for a single operation. they use a mock adapter (createMockAdapter) to isolate the sync operation. not a journey test.

**translateHook.test.ts**: unit tests for the transformer (onTalk → UserPromptSubmit). not a journey test.

**config.dao.test.ts** (anthropic): integration tests for claude code settings dao. not a journey test.

**config.dao.test.ts** (opencode): integration tests for opencode plugin dao. not a journey test.

**genBrainHooksAdapterForClaudeCode.test.ts**: integration tests for the adapter. not a journey test.

---

## what makes a test a journey test?

| characteristic | journey test | unit/integration test |
|----------------|--------------|----------------------|
| scope | full user scenario | single operation |
| layers crossed | multiple (ui → api → db) | one or few |
| suffix | `.play.test.ts` | `.test.ts` or `.integration.test.ts` |
| setup | realistic end-to-end | mocked or isolated |
| purpose | verify user experience | verify implementation |

### example journey test (hypothetical)

```typescript
// onTalk.play.test.ts
describe('onTalk hook journey', () => {
  given('[case1] developer declares onTalk hook', () => {
    when('[t0] links role', () => {
      then('settings.json has UserPromptSubmit', async () => { ... });
    });
    when('[t1] user submits prompt', () => {
      then('hook fires', async () => { ... });
    });
  });
});
```

this hypothetical test would cross multiple layers and test the full user experience. **no such test was added in this work.**

---

## reflection: should journey tests have been added?

paused to consider: does this work warrant journey tests?

**the blackbox criteria (usecase.3) describes:**
> given(role with onTalk hook is linked)
> when(user submits a prompt)
> then(hook fires)

this usecase crosses layers:
1. role declaration (domain.objects)
2. sync to settings.json (domain.operations + adapter)
3. claude code runtime (external system)

**analysis:**

- layers 1 and 2 are tested via integration tests
- layer 3 (claude code runtime) is external — anthropic's responsibility
- a journey test would need to either:
  - mock claude code runtime (violates integration test principles)
  - invoke actual claude code (out of scope for unit/integration tests)

**decision:** journey tests are not appropriate for this feature because the terminal layer (claude code runtime) is external.

---

## what I found (non-issue)

**non-issue:** no journey tests needed; convention not violated.

**why it holds:**

| check | result | evidence |
|-------|--------|----------|
| are added tests journey tests? | no | examined each test file |
| do they use `.play.test.ts`? | n/a | no journey tests added |
| should journey tests have been added? | no | external runtime layer |
| are tests in right location? | yes | collocated with source |
| are tests named correctly? | yes | `.test.ts` for unit/integration |

---

## conclusion

this review passes because:
- no journey tests were added (all tests are unit or integration tests)
- the added tests are correctly named: `.test.ts` suffix
- the added tests are in the correct location: collocated with source
- journey tests would require external runtime layer which is out of scope
- the `.play.test.ts` convention does not apply to this work

