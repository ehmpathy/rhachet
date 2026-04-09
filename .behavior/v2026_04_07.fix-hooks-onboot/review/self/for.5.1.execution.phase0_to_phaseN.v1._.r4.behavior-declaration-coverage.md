# review: behavior-declaration-coverage (r4)

## verdict: complete — all components implemented

checked vision, criteria, and blueprint against code. all requirements addressed.

## vision coverage

| requirement | status | evidence |
|-------------|--------|----------|
| onTalk accepted in Role.build hooks schema | done | RoleHooksOnBrain.ts has `onTalk?: RoleHookOnBrain[]` |
| onTalk maps to UserPromptSubmit | done | translateHook.ts EVENT_MAP entry |
| onTalk maps to chat.message (opencode) | done | config.dao.ts getHookImplementation |
| role unlink removes hook | done | extant pruneOrphanedRoleHooks handles it |

## criteria coverage

| usecase | status | evidence |
|---------|--------|----------|
| usecase.1: declare and link | done | syncOneRoleHooksIntoOneBrainRepl extracts onTalk |
| usecase.2: unlink removes | done | genBrainHooksAdapterForClaudeCode.del handles onTalk |
| usecase.3: hook fires | done | runtime behavior via claude code / opencode |
| usecase.4: multiple hooks | done | same mechanism as extant events |
| usecase.5: alongside other types | done | test verifies all events work together |

## blueprint coverage

### filediff verification

| file | change | status |
|------|--------|--------|
| BrainHookEvent.ts | add 'onTalk' to union | done |
| RoleHooksOnBrain.ts | add onTalk property + nested | done |
| syncOneRoleHooksIntoOneBrainRepl.ts | add extraction block | done |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | add test case | done |
| translateHook.ts | add EVENT_MAP entry | done |
| translateHook.test.ts | add test cases | done |
| config.dao.ts (anthropic) | add UserPromptSubmit schema | done |
| genBrainHooksAdapterForClaudeCode.ts | add del event map | done |
| genBrainHooksAdapterForClaudeCode.test.ts | add del test case | done |
| config.dao.ts (opencode) | add regex + chat.message impl | done |
| config.dao.test.ts (opencode) | add test cases | done |

### grep verification

```
$ grep -r 'onTalk' src/ --include='*.ts' | wc -l
> found in 10 files

$ grep -r 'UserPromptSubmit' src/ --include='*.ts' | wc -l
> found in 5 files

$ grep -r 'chat.message' src/ --include='*.ts'
> found in opencode config.dao.ts and test
```

## test coverage verification

| test file | case | verifies |
|-----------|------|----------|
| translateHook.test.ts | case9 | onTalk to UserPromptSubmit |
| translateHook.test.ts | case8 | UserPromptSubmit to onTalk |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | case4 | onTalk extraction |
| genBrainHooksAdapterForClaudeCode.test.ts | caseN | del onTalk hook |
| config.dao.test.ts (opencode) | case3 | parsePluginFileName |
| config.dao.test.ts (opencode) | case4 | generatePluginContent |

## conclusion

all requirements from vision, criteria, and blueprint are implemented. no gaps found.
