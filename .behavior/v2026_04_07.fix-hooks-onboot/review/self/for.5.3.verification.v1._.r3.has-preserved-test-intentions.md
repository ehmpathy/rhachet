# review: has-preserved-test-intentions (r3)

## verdict: complete — no test intentions modified

this work only added new test cases. no extant test assertions were modified.

---

## new test cases added

| file | case | purpose |
|------|------|---------|
| translateHook.test.ts | [case8] UserPromptSubmit entry | verify translateHookFromClaudeCode maps UserPromptSubmit → onTalk |
| translateHook.test.ts | [case9] onTalk hook | verify translateHookToClaudeCode maps onTalk → UserPromptSubmit |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | [case4] role with onTalk hooks | verify onTalk hooks are extracted and synced |
| config.dao.test.ts (opencode) | [case3] valid onTalk filename | verify parsePluginFileName accepts onTalk event |
| config.dao.test.ts (opencode) | [case4] onTalk hook | verify generatePluginContent produces chat.message hook |
| genBrainHooksAdapterForClaudeCode.test.ts | del onTalk from UserPromptSubmit bucket | verify del removes onTalk from correct event bucket |

---

## extant test cases unchanged

searched for modified test assertions in extant cases:

```
$ git diff HEAD~1 -- '*.test.ts' | grep -E '^[-+]\s*(expect|then|it\(|describe\()' | grep -v '^\+\+'
```

all diff lines are additions (no `-` lines for expect/then/it/describe). no extant test behavior was modified.

---

## why it holds

| check | status | evidence |
|-------|--------|----------|
| no extant assertions modified | ✓ | git diff shows only additions |
| no extant test cases renamed | ✓ | case numbers for new tests are new slots |
| no extant test behavior changed | ✓ | new cases test new onTalk codepath only |

this work extends test coverage without altering extant test intentions.
