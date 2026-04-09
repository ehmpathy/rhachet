# review: has-play-test-convention (r9)

## verdict: complete — no journey tests in this work

this work adds unit and integration tests, not journey tests. the `.play.test.ts` convention does not apply.

---

## verification process

I checked the test files added in this branch:

```
git diff origin/main --name-only | grep test
```

**test files changed:**

| file | type | purpose |
|------|------|---------|
| `translateHook.test.ts` | unit | test transformer |
| `config.dao.test.ts` (anthropic) | integration | test claude code dao |
| `config.dao.test.ts` (opencode) | integration | test opencode dao |
| `genBrainHooksAdapterForClaudeCode.test.ts` | integration | test adapter |
| `syncOneRoleHooksIntoOneBrainRepl.test.ts` | integration | test sync operation |

---

## what is a journey test?

journey tests (`.play.test.ts`) test complete user scenarios:

| journey test | unit/integration test |
|--------------|----------------------|
| "user declares onTalk, links role, submits prompt, hook fires" | "onTalk maps to UserPromptSubmit" |
| tests full workflow | tests single operation |
| exercises multiple layers | exercises one layer |
| uses `.play.test.ts` suffix | uses `.test.ts` or `.integration.test.ts` suffix |

---

## are the added tests journey tests?

| test file | scenario tested | journey? |
|-----------|-----------------|----------|
| translateHook.test.ts | onTalk → UserPromptSubmit | no — single transformer |
| config.dao.test.ts (anthropic) | UserPromptSubmit in schema | no — dao operation |
| config.dao.test.ts (opencode) | onTalk → chat.message | no — dao operation |
| genBrainHooksAdapterForClaudeCode.test.ts | del removes from UserPromptSubmit | no — adapter operation |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | onTalk hooks extracted | no — sync operation |

**none of the tests are journey tests.** they are:
- unit tests for transformers
- integration tests for daos and adapters

---

## should journey tests have been added?

paused to consider: does this work warrant journey tests?

**analysis:**

the blackbox criteria (usecase.3) describes:
> "given(role with onTalk hook is linked), when(user submits a prompt), then(hook fires)"

this usecase crosses layers:
1. role declaration (domain.objects)
2. sync to settings.json (domain.operations + adapter)
3. claude code runtime (external system)

a full journey test would require:
- mock or stub claude code runtime
- end-to-end orchestration of link → submit → fire

**decision:** journey tests for this flow would require a mock of the claude code runtime, which violates the integration test principles. the critical path is verified via integration tests that test each layer:

1. `syncOneRoleHooksIntoOneBrainRepl.test.ts` — verifies sync writes to settings.json
2. `genBrainHooksAdapterForClaudeCode.test.ts` — verifies adapter operations
3. claude code runtime — out of scope (tested by anthropic)

---

## what I found (non-issue)

**non-issue:** no journey tests needed.

**why it holds:**

| check | result |
|-------|--------|
| are added tests journey tests? | no — unit and integration tests |
| do journey tests need `.play.test.ts`? | yes — but none added |
| should journey tests have been added? | no — would require mock of external system |
| are integration tests sufficient? | yes — each layer is tested |

---

## conclusion

this review passes because:
- no journey tests were added (none of the tests are full user scenario tests)
- the added tests are correctly named with `.test.ts` and `.integration.test.ts` suffixes
- journey tests would require a mock of claude code runtime (antipattern)
- integration tests provide sufficient coverage of the critical path

