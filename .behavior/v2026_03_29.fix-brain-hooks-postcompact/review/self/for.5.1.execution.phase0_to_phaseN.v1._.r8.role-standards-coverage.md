# self-review: role-standards-coverage (r8)

## question

are all relevant mechanic standards applied? are there patterns that should be present but are absent?

## rule directories checked

i enumerated the relevant rule categories from mechanic briefs:

- code.prod/pitofsuccess.errors/ — error validation, fail-fast
- code.prod/pitofsuccess.procedures/ — idempotent operations
- code.prod/pitofsuccess.typedefs/ — type safety, no as-cast
- code.test/ — test coverage, BDD structure, test-fns usage

## search: verify test-fns usage

```
grep "import.*from 'test-fns'" src/_topublish/rhachet-brains-anthropic/src/hooks/
→ config.dao.test.ts:4: import { given, then, useBeforeAll, when } from 'test-fns';
→ genBrainHooksAdapterForClaudeCode.test.ts:4: import { given, then, useBeforeAll, when } from 'test-fns';
→ translateHook.test.ts:1: import { given, then, when } from 'test-fns';
```

**why it holds:** all test files in the hooks directory import from test-fns and use the BDD given/when/then pattern.

## search: verify as-cast usage

```
grep 'as\s+\w+' src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts
→ line 17: ] as const;
→ line 70: bootTrigger as (typeof VALID_BOOT_EVENTS)[number]
→ line 103: 'onBoot' as BrainHookEvent,
→ line 113: )?.[0] as BrainHookEvent | undefined;
```

**coverage check:** are these casts justified?

| line | cast | justification |
|------|------|---------------|
| 17 | `as const` | standard pattern for literal union arrays, not a runtime cast |
| 70 | `bootTrigger as (typeof ...)` | type narrow for array.includes() — typescript limitation |
| 103 | `'onBoot' as BrainHookEvent` | literal type narrow in object literal |
| 113 | `as BrainHookEvent \| undefined` | type narrow from Object.entries()[0] — typescript cannot infer |

**why it holds:** all casts are at typescript type boundaries where inference fails. no runtime value coercion. follows rule.forbid.as-cast exception for type narrow.

## search: verify error patterns

```
grep 'UnexpectedCodePathError' src/_topublish/rhachet-brains-anthropic/src/hooks/
→ translateHook.ts:1: import { UnexpectedCodePathError } from 'helpful-errors';
→ translateHook.ts:73: throw new UnexpectedCodePathError(
```

**coverage check:** does translateHookToClaudeCode validate invalid input?

```ts
// translateHook.ts lines 68-77
if (!VALID_BOOT_EVENTS.includes(bootTrigger as ...)) {
  throw new UnexpectedCodePathError(
    `invalid filter.what value for onBoot: ${bootTrigger}`,
    { hook, validValues: VALID_BOOT_EVENTS },
  );
}
```

**why it holds:** the function validates `filter.what` values and fails fast with helpful error metadata. coverage is present.

## search: verify test coverage

```
grep -c 'given\|then' src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts
→ given: 16 occurrences
→ then: 30+ occurrences
```

**coverage check:** are all usecases from criteria tested?

| usecase | criteria requirement | test coverage |
|---------|---------------------|---------------|
| usecase.1 PostCompact | hook fires on PostCompact | case5 (lines 113-137) |
| usecase.2 PreCompact | hook fires on PreCompact | case6 (lines 139-159) |
| usecase.3 backwards compat | no filter = SessionStart | case1 (lines 12-43) |
| usecase.4 explicit SessionStart | filter.what=SessionStart | case7 (lines 161-181) |
| usecase.5 wildcard | filter.what=* = all three | case8 (lines 183-211) |
| usecase.6 invalid fails | invalid filter fails fast | case9 (lines 213-229) |

**why it holds:** all 6 usecases from criteria have dedicated test cases with explicit assertions.

## search: verify reverse translation tests

```
grep 'PostCompact\|PreCompact' src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts
→ lines 113, 119, 129, 139, 145, 155, 340, 348, 361, 367, 371, 390
```

**coverage check:** does translateHookFromClaudeCode have tests for new events?

| event | test case | location |
|-------|-----------|----------|
| PostCompact | case5 (reverse) | lines 340-365 |
| PreCompact | case6 (reverse) | lines 367-394 |

**why it holds:** reverse translation has explicit tests for both PostCompact and PreCompact events.

## search: verify type coverage

```
grep 'PreCompact\|PostCompact' src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao.ts
→ line 21: PreCompact?: ClaudeCodeHookEntry[];
→ line 22: PostCompact?: ClaudeCodeHookEntry[];
```

**coverage check:** are new events declared in ClaudeCodeSettings interface?

```ts
// config.dao.ts lines 18-27
export interface ClaudeCodeSettings {
  hooks?: {
    SessionStart?: ClaudeCodeHookEntry[];
    PreCompact?: ClaudeCodeHookEntry[];    // ← added
    PostCompact?: ClaudeCodeHookEntry[];   // ← added
    PreToolUse?: ClaudeCodeHookEntry[];
    PostToolUse?: ClaudeCodeHookEntry[];
    Stop?: ClaudeCodeHookEntry[];
  };
}
```

**why it holds:** both PreCompact and PostCompact are declared in the interface. typescript will type-check hook bucket access.

## search: verify del method coverage

**coverage check:** does del search all boot event buckets?

```ts
// genBrainHooksAdapterForClaudeCode.ts lines 169-174
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']  // ← all three
    : event === 'onTool' ? ['PreToolUse'] : ['Stop'];
```

**why it holds:** when del receives `onBoot` event, it searches all three boot event buckets. this handles the case where a wildcard hook was registered and must be removed from all buckets.

## search: verify supplier brief coverage

**coverage check:** does the supplier brief document all filter.what values?

```markdown
// howto.use.brain.hooks.md lines 36-42
| value | fires on | use case |
|-------|----------|----------|
| (none) | SessionStart | backwards compat default |
| `SessionStart` | new session + compaction | same as no filter |
| `PostCompact` | compaction only | verify compaction assumptions |
| `PreCompact` | before compaction | checkpoint state |
| `*` | all three events | universal boot hook |
```

**why it holds:** the table documents all five filter.what values with use cases. suppliers can understand when each value applies.

## search: verify readme link

```
grep 'hooks' readme.md
→ line 517: | `hooks` | brain lifecycle hooks | [howto.use.brain.hooks](...) |
```

**why it holds:** the hooks brief is linked from the brains section of the readme. discoverable to users.

## coverage summary

| category | pattern | present? |
|----------|---------|----------|
| error validation | UnexpectedCodePathError for invalid input | ✓ |
| test coverage | all 6 usecases tested | ✓ |
| reverse translation tests | PostCompact + PreCompact | ✓ |
| type declarations | ClaudeCodeSettings interface | ✓ |
| del method | searches all boot buckets | ✓ |
| supplier brief | all filter.what values documented | ✓ |
| readme link | hooks brief linked | ✓ |

## conclusion

all required patterns are present:
- error validation with helpful-errors
- comprehensive test coverage for all criteria usecases
- type declarations for new events
- del method handles wildcard hooks
- documentation complete with readme link

no coverage gaps found.

