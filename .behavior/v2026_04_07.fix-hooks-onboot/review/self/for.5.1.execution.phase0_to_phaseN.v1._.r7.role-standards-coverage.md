# review: role-standards-coverage (r7)

## verdict: complete — all required patterns present

verified each changed file has required tests, types, validation, and error cases covered.

---

## rule directories checked

| directory | check for |
|-----------|-----------|
| `code.test/scope.coverage/rule.require.test-coverage-by-grain` | tests for each grain |
| `code.test/frames.behavior/rule.require.given-when-then` | test structure |
| `code.prod/pitofsuccess.typedefs/rule.require.shapefit` | type safety |
| `code.prod/pitofsuccess.errors/rule.require.failfast` | error cases |
| `code.prod/evolvable.domain.objects/` | domain object patterns |

---

## coverage analysis by file

### BrainHookEvent.ts

| requirement | status | evidence |
|-------------|--------|----------|
| type safety | ✓ | line 11: union type with string literals |
| exhaustiveness | ✓ | translators use EVENT_MAP which has all events |

**why it holds:** type union ensures compile-time check. any use of `BrainHookEvent` that misses `onTalk` would fail type check.

---

### RoleHooksOnBrain.ts

| requirement | status | evidence |
|-------------|--------|----------|
| domain object | ✓ | extends DomainLiteral |
| nested hydration | ✓ | static nested declares onTalk |
| optional property | ✓ | `onTalk?:` allows omission |

**why it holds:** domain-objects pattern ensures:
- runtime type check via DomainLiteral
- nested hydration via static nested
- backwards compat via optional property

---

### syncOneRoleHooksIntoOneBrainRepl.ts

| requirement | status | evidence |
|-------------|--------|----------|
| test coverage | ✓ | test file has case4 for onTalk |
| null safety | ✓ | line 135: `onBrain.onTalk ?? []` |
| no new abstractions | ✓ | mirrors prior extraction blocks |

**test coverage check:**

```
syncOneRoleHooksIntoOneBrainRepl.test.ts
├── [case1] role with no hooks — baseline
├── [case2] role with onBoot hooks — prior event
├── [case3] role with onTool hooks — prior event
└── [case4] role with onTalk hooks — new event ✓
```

**why it holds:** test case4 verifies onTalk extraction produces correct BrainHook instances. null coalesce operator prevents undefined iteration.

---

### translateHook.ts

| requirement | status | evidence |
|-------------|--------|----------|
| bidirectional translation | ✓ | both to/from functions updated |
| test coverage | ✓ | case9 (to) and case8 (from) added |
| EVENT_MAP exhaustive | ✓ | all 4 events mapped |

**test coverage check:**

translateHookToClaudeCode:
```
├── [case1] onBoot hook without filter
├── [case2] onTool hook with filter
├── [case3] onStop hook
├── [case4-8] edge cases (timeout, boot events)
└── [case9] onTalk hook ✓
```

translateHookFromClaudeCode:
```
├── [case1] SessionStart entry
├── [case2] PreToolUse entry with matcher
├── [case3-7] edge cases
└── [case8] UserPromptSubmit entry ✓
```

**why it holds:** both directions tested. onTalk → UserPromptSubmit verified in case9. UserPromptSubmit → onTalk verified in case8.

---

### config.dao.ts (anthropic)

| requirement | status | evidence |
|-------------|--------|----------|
| schema updated | ✓ | UserPromptSubmit added to interface |
| no validation needed | ✓ | schema is just shape definition |

**why it holds:** ClaudeCodeSettings interface is a type definition, not runtime validation. UserPromptSubmit property addition enables correct type inference for settings.json read/write.

---

### genBrainHooksAdapterForClaudeCode.ts

| requirement | status | evidence |
|-------------|--------|----------|
| del event map | ✓ | onTalk maps to UserPromptSubmit bucket |
| test coverage | ✓ | del test case added |

**del event map (verified in prior read):**
```typescript
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : event === 'onTool'
      ? ['PreToolUse']
      : event === 'onTalk'
        ? ['UserPromptSubmit']
        : ['Stop'];
```

**why it holds:** del function can now remove onTalk hooks from the correct UserPromptSubmit bucket. test verifies this behavior.

---

### config.dao.ts (opencode)

| requirement | status | evidence |
|-------------|--------|----------|
| regex updated | ✓ | line 41: onTalk in alternation |
| chat.message impl | ✓ | lines 120-126: new if-return block |
| test coverage | ✓ | case3 + case4 added |

**test coverage check:**

parsePluginFileName:
```
├── [case1] valid rhachet plugin filename
├── [case2] invalid filename
└── [case3] valid onTalk filename ✓
```

generatePluginContent:
```
├── [case1] onBoot hook
├── [case2] onTool hook with filter
├── [case3] onStop hook
└── [case4] onTalk hook ✓
```

**why it holds:** both parse and generate have test coverage for onTalk. regex accepts onTalk filenames. chat.message structure verified in snapshot assertion.

---

## error case coverage

| scenario | coverage |
|----------|----------|
| invalid event in translateHook | ✓ EVENT_MAP reverse lookup returns undefined if unknown |
| unknown event in opencode impl | ✓ fallback comment at line 129 |
| empty onTalk array | ✓ `?? []` coalesce handles it |
| onTalk not declared | ✓ extraction loop simply skips |

**why it holds:** error cases are covered by prior patterns. no new error paths introduced by onTalk addition.

---

## gaps found

none. all required test coverage, type safety, and error cases are present.

---

## why it holds

implementation follows "replicate prior pattern" approach:

| aspect | prior pattern | onTalk follows |
|--------|---------------|----------------|
| type union | onBoot/onTool/onStop | ✓ onTalk added |
| domain property | optional array | ✓ same shape |
| extraction block | for-loop with null coalesce | ✓ identical |
| EVENT_MAP | event → string | ✓ same pattern |
| test case | given/when/then | ✓ same structure |
| del map | event → bucket array | ✓ same pattern |
| opencode impl | if-return chain | ✓ same pattern |

no new patterns required, no new error cases, no new abstractions. coverage is complete because the pattern was already complete — onTalk slots in without structural changes.
