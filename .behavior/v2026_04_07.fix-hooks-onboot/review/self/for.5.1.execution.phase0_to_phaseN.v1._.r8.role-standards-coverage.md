# review: role-standards-coverage (r8)

## verdict: complete — line-by-line verification confirms all standards covered

inspected every file for absent patterns. verified tests, types, validation, and error cases at specific line numbers.

---

## rule directories checked for coverage

| directory | checks for absent |
|-----------|-------------------|
| `code.test/scope.coverage/` | unit tests for transformers, integration tests for orchestrators |
| `code.test/frames.behavior/` | given-when-then structure |
| `code.prod/pitofsuccess.typedefs/` | type definitions, no `any` |
| `code.prod/pitofsuccess.errors/` | failfast guards, error cases |
| `code.prod/pitofsuccess.procedures/` | idempotency, null safety |
| `code.prod/readable.comments/` | .what/.why headers |

---

## BrainHookEvent.ts — coverage check

### types covered?

**line 11:**
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop' | 'onTalk';
```

**check:** string literal union, not `string`. no `any`. ✓

### exhaustiveness check in consumers?

translateHook.ts uses EVENT_MAP (Record<BrainHookEvent, string>) which forces all events to be mapped. if onTalk were absent from the map, TypeScript would fail.

**evidence (translateHook.ts:23-28):**
```typescript
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
  onTalk: 'UserPromptSubmit',
};
```

**why coverage holds:** Record<BrainHookEvent, string> requires all union members. compiler enforces onTalk is present.

---

## RoleHooksOnBrain.ts — coverage check

### domain object pattern complete?

**line 16-26:**
```typescript
export class RoleHooksOnBrain
  extends DomainLiteral<RoleHooksOnBrain>
  implements RoleHooksOnBrain
{
  public static nested = {
    onBoot: RoleHookOnBrain,
    onTool: RoleHookOnBrain,
    onStop: RoleHookOnBrain,
    onTalk: RoleHookOnBrain,  // line 24
  };
}
```

| pattern element | status | line |
|-----------------|--------|------|
| extends DomainLiteral | ✓ | 17 |
| implements interface | ✓ | 18 |
| static nested | ✓ | 20-25 |
| onTalk in nested | ✓ | 24 |

**why coverage holds:** all 4 domain object pattern elements present. onTalk is in both interface (line 13) and nested (line 24).

---

## syncOneRoleHooksIntoOneBrainRepl.ts — coverage check

### test coverage for onTalk?

**syncOneRoleHooksIntoOneBrainRepl.test.ts:**
```
line 85-115: [case4] role with onTalk hooks
  └─ then('creates onTalk hooks') at line 105
```

**check:** test case verifies onTalk extraction. ✓

### null safety for optional property?

**line 135:**
```typescript
for (const h of onBrain.onTalk ?? []) {
```

**check:** null coalesce `?? []` prevents iteration over undefined. ✓

### idempotency preserved?

**lines 42-45 (diff computation):**
```typescript
const { toAdd, toUpdate, toRemove, unchanged } = computeHookDiff({
  declared,
  hooksFound,
});
```

**check:** diff computation is unchanged. onTalk hooks flow through same idempotent sync. ✓

### error case: invalid event?

extraction block uses hardcoded `'onTalk'` string (line 139). no user input validation needed — event comes from Role declaration which is type-checked.

**why coverage holds:** all 4 extraction blocks (onBoot, onTool, onStop, onTalk) use same pattern. onTalk has dedicated test case. null safety via coalesce.

---

## translateHook.ts — coverage check

### bidirectional test coverage?

**translateHookToClaudeCode:**
- line 177-204: `[case9] onTalk hook` tests forward translation
- assertions: event === 'UserPromptSubmit', matcher === '*', command preserved, timeout converted

**translateHookFromClaudeCode:**
- line 418-451: `[case8] UserPromptSubmit entry` tests reverse translation
- assertions: event === 'onTalk', author set, command preserved, timeout as IsoDuration

**why coverage holds:** both directions tested with 5+ assertions each.

### error case: invalid onBoot filter?

**lines 59-68:**
```typescript
if (
  !VALID_BOOT_EVENTS.includes(
    bootTrigger as (typeof VALID_BOOT_EVENTS)[number],
  )
) {
  throw new UnexpectedCodePathError(
    `invalid filter.what value for onBoot: ${bootTrigger}`,
    { hook, validValues: VALID_BOOT_EVENTS },
  );
}
```

**check:** this error case is specific to onBoot. onTalk has no filter validation needed (single event, no sub-events per vision spec).

**test for error case (line 159-175):**
```typescript
given('[case8] onBoot hook with invalid filter.what', () => {
  // ...
  then('throws UnexpectedCodePathError', () => {
    expect(() => translateHookToClaudeCode({ hook })).toThrow(
      'invalid filter.what value for onBoot: InvalidEvent',
    );
  });
});
```

**why coverage holds:** onTalk needs no filter validation per spec. onBoot error case tested.

---

## genBrainHooksAdapterForClaudeCode.ts — coverage check

### del event map updated?

**lines 166-173 (verified in prior read):**
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

**check:** onTalk maps to `['UserPromptSubmit']`. ✓

### test for del?

**genBrainHooksAdapterForClaudeCode.test.ts** has test case for del that verifies onTalk hooks are removed from UserPromptSubmit bucket.

**why coverage holds:** del event map updated, test verifies cleanup works.

---

## config.dao.ts (opencode) — coverage check

### regex accepts onTalk?

**line 41:**
```typescript
/^rhachet-(.+)-(onBoot|onTool|onStop|onTalk)-[a-zA-Z0-9_-]+\.ts$/,
```

**check:** `onTalk` in alternation group. ✓

### chat.message implementation?

**lines 120-126:**
```typescript
if (event === 'onTalk') {
  return `    chat: {
    message: async () => {
      execSync(${JSON.stringify(command)}, { stdio: "inherit", timeout: ${timeoutMs} });
    },
  },`;
}
```

**check:** implements chat.message per vision spec ("onTalk maps to chat.message for opencode"). ✓

### test for parse?

**config.dao.test.ts lines 74-86:**
```typescript
given('[case3] valid onTalk filename', () => {
  when('[t0] parsed', () => {
    const result = parsePluginFileName(
      'rhachet-repo-test-role-tester-onTalk-ZWNobyAidGFsayI.ts',
    );

    then('returns author and event', () => {
      expect(result?.event).toBe('onTalk');
    });
  });
});
```

### test for generate?

**config.dao.test.ts lines 154-180:**
```typescript
given('[case4] onTalk hook', () => {
  when('[t0] generated', () => {
    const content = generatePluginContent({
      author: 'repo=test/role=tester',
      event: 'onTalk',
      command: 'echo "talk"',
      timeout: 5000,
    });

    then('includes chat.message hook', () => {
      expect(content).toContain('chat:');
      expect(content).toContain('message:');
    });

    then('includes execSync call with timeout', () => {
      expect(content).toContain('timeout: 5000');
    });
  });
});
```

**why coverage holds:** regex, implementation, and both parse/generate tests present.

---

## gaps found

none. every required pattern is present at specific line numbers:

| file | required | found at |
|------|----------|----------|
| BrainHookEvent.ts | type safety | line 11 |
| RoleHooksOnBrain.ts | domain object | lines 16-26 |
| syncOneRoleHooksIntoOneBrainRepl.ts | null safety | line 135 |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | test case | lines 85-115 |
| translateHook.ts | EVENT_MAP entry | line 27 |
| translateHook.test.ts | bidirectional tests | lines 177-204, 418-451 |
| genBrainHooksAdapterForClaudeCode.ts | del map | lines 166-173 |
| config.dao.ts (opencode) | regex + impl | lines 41, 120-126 |
| config.dao.test.ts (opencode) | parse + generate tests | lines 74-86, 154-180 |

---

## why it holds

implementation slots into prior patterns without structural changes. all required coverage was already established for onBoot/onTool/onStop — onTalk replicates that coverage exactly:

| coverage type | evidence |
|---------------|----------|
| type safety | Record<BrainHookEvent, string> enforces exhaustiveness |
| null safety | `?? []` coalesce on optional property |
| test coverage | dedicated test cases for new code paths |
| error coverage | no new error paths (per spec: no filter validation) |
| domain object | interface + nested both updated |

coverage is complete because the pattern template was already complete.
