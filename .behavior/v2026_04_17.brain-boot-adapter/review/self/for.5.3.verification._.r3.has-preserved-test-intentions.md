# review: has-preserved-test-intentions (r3)

## verdict: pass

## tests I touched

### new tests (added)

| test file | purpose | intention |
|-----------|---------|-----------|
| genBrainConfigDir.integration.test.ts | verify config dir creation | new behavior, new test |
| genClaudeMdContent.test.ts | verify boot order | new behavior, new test |
| genBrainBootsAdapterForClaudeCode.test.ts | verify adapter contract | new behavior, new test |
| getBrainBootsAdapterByConfigImplicit.test.ts | verify adapter discovery | new behavior, new test |

No intention change — these are new tests for new code.

### deleted tests

| test file | reason |
|-----------|--------|
| assertRegistryBootHooksDeclared.test.ts | prod code deleted (obsolete with CLAUDE.md) |
| findRolesWithBootableButNoHook.test.ts | prod code deleted (helper for above) |

**why deletion is correct:**
- assertRegistryBootHooksDeclared.ts was a validation that warned when bootable roles lacked SessionStart hooks
- with CLAUDE.md approach, this validation is obsolete — boots go to CLAUDE.md, not hooks
- the blueprint (line 129) explicitly states `[-] assertRegistryBootHooksDeclared.ts # remove (obsolete)`

### modified tests

| test file | what changed | intention preserved? |
|-----------|--------------|---------------------|
| enrollBrainCli.test.ts | added tests for configDir param | yes — extended, not weakened |

## forbidden patterns check

| forbidden action | did I do this? |
|------------------|----------------|
| weaken assertions | no |
| remove test cases that "no longer apply" | no — deleted tests were for deleted code |
| change expected values to match broken output | no |
| delete tests that fail instead of fix code | no |

## why this holds

1. new tests verify new behavior — no prior intention to preserve
2. deleted tests were for deleted prod code — blueprint mandated deletion
3. modified tests only extended coverage — never weakened assertions
