# self-review r7: has-thorough-test-coverage

## what i reviewed

i verified the blueprint has thorough test coverage for all codepaths after r6 found and fixed a gap.

---

## layer coverage audit

| codepath | layer | declared test type | correct? |
|----------|-------|-------------------|----------|
| translateHookToClaudeCode | transformer | unit tests | yes |
| translateHookFromClaudeCode | transformer | unit tests | yes |
| extractDeclaredHooks | orchestrator | integration tests | yes |
| config.dao (opencode) | communicator | integration tests | yes |
| genBrainHooksAdapterForClaudeCode.del | communicator | integration tests | yes (fixed in r6) |

**all layers have correct test types declared.**

---

## case coverage audit

| codepath | positive | negative | edge | complete? |
|----------|----------|----------|------|-----------|
| translateHookToClaudeCode + onTalk | onTalk -> UserPromptSubmit | n/a | with timeout | yes |
| translateHookFromClaudeCode + onTalk | UserPromptSubmit -> onTalk | n/a | no filter.what | yes |
| extractDeclaredHooks + onTalk | role with onTalk hooks | n/a | empty array | yes |
| genBrainHooksAdapterForClaudeCode.del + onTalk | deletes from UserPromptSubmit | already covered | n/a | yes (fixed in r6) |
| parsePluginFileName + onTalk | valid filename | already covered | n/a | yes |
| generatePluginContent + onTalk | chat.message output | n/a | with timeout | yes |

**note on negative cases:** these codepaths don't require new negative tests because:
- invalid event handler is already covered by extant tests
- onTalk follows extant patterns that already have negative coverage

---

## snapshot coverage audit

**question:** are snapshots required for this blueprint?

**answer:** no — this blueprint does not add new contract entry points. it extends internal machinery that extant contracts use. extant acceptance tests will exercise onTalk once implementation completes, and their snapshots will update to reflect the new hook type.

---

## test tree audit

verified all test files are declared in the test tree:

```
src/_topublish/rhachet-brains-anthropic/src/hooks/
  translateHook.test.ts                        [declared]
  genBrainHooksAdapterForClaudeCode.test.ts    [declared - fixed in r6]

src/domain.operations/brains/
  syncOneRoleHooksIntoOneBrainRepl.test.ts     [declared]

src/_topublish/rhachet-brains-opencode/src/hooks/
  config.dao.test.ts                           [declared]
```

---

## r6 gap fix verification

r6 found that genBrainHooksAdapterForClaudeCode.ts was added to the codepath tree but no test was declared.

**fix applied to blueprint:**
- filediff tree: added `genBrainHooksAdapterForClaudeCode.test.ts`
- coverage by layer: added `genBrainHooksAdapterForClaudeCode` as communicator
- coverage by case: added `genBrainHooksAdapterForClaudeCode.del + onTalk`
- test tree: added test case for del onTalk

**verification:** all four locations now declare the test.

---

## verdict

**PASSED.** all codepaths have appropriate test coverage declared by layer and case type. the r6 gap has been fixed.
