# self-review r8: has-consistent-mechanisms

## what i reviewed

i searched the codebase for related codepaths and verified each mechanism in the blueprint follows extant patterns.

---

## codebase search results

searched for: `EVENT_MAP`, `translateHook`, `hookAdapter`, `BrainHook`

found 29 files with hook-related code. verified these key files:
- `src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts`
- `src/_topublish/rhachet-brains-opencode/src/hooks/config.dao.ts`
- `src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts`

---

## mechanism-by-mechanism verification

### 1. genBrainHooksAdapterForClaudeCode.ts del event map

**blueprint proposes:** extend ternary chain to handle onTalk

**extant pattern (lines 166-171):**
```typescript
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : event === 'onTool'
      ? ['PreToolUse']
      : ['Stop'];
```

**verification:** the blueprint extends this ternary chain by one case:
```typescript
: event === 'onTalk'
  ? ['UserPromptSubmit']
  : ['Stop'];
```

**consistent:** yes — extends extant ternary pattern.

---

### 2. opencode config.dao.ts parsePluginFileName regex

**blueprint proposes:** add `|onTalk` to regex

**extant pattern (line 41):**
```typescript
/^rhachet-(.+)-(onBoot|onTool|onStop)-[a-zA-Z0-9_-]+\.ts$/
```

**verification:** the blueprint adds one more regex alternative: `|onTalk`

**consistent:** yes — extends extant regex pattern.

---

### 3. opencode config.dao.ts getHookImplementation

**blueprint proposes:** add `if (event === 'onTalk')` case

**extant pattern (lines 90-118):**
```typescript
if (event === 'onBoot') { ... return `session: { created: ... }`; }
if (event === 'onTool') { ... return `tool: { execute: { before: ... } }`; }
if (event === 'onStop') { ... return `session: { idle: ... }`; }
```

**verification:** the blueprint adds one more if-branch:
```typescript
if (event === 'onTalk') { return `chat: { message: ... }`; }
```

**consistent:** yes — extends extant if-chain pattern.

---

### 4. translateHook.ts EVENT_MAP

**blueprint proposes:** add `onTalk: 'UserPromptSubmit'` entry

**extant pattern (lines 23-27):**
```typescript
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
};
```

**verification:** the blueprint adds one more entry. reverse lookup at lines 101-105 uses `Object.entries()` — automatically handles new entries without code change.

**consistent:** yes — extends extant map pattern.

---

### 5. BrainHookEvent type and RoleHooksOnBrain interface

**blueprint proposes:** add `'onTalk'` to union and `onTalk?: RoleHookOnBrain[]` to interface

**extant patterns:**
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';

export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
}
```

**verification:** the blueprint adds parallel entries for onTalk.

**consistent:** yes — extends extant type patterns.

---

### 6. extractDeclaredHooks for-loops

**blueprint proposes:** add for-loop for onTalk

**extant pattern (from prior research):**
```typescript
for (const h of onBrain.onBoot ?? []) { ... }
for (const h of onBrain.onTool ?? []) { ... }
for (const h of onBrain.onStop ?? []) { ... }
```

**verification:** the blueprint adds one more parallel for-loop.

**consistent:** yes — extends extant hardcoded loop pattern.

---

## duplicate mechanism check

searched for alternate event map mechanisms:
- no other EVENT_MAP or hook translation utils found outside translateHook.ts
- no other plugin filename patterns outside config.dao.ts
- no other hook implementation generators outside config.dao.ts

**conclusion:** all proposed mechanisms extend extant single-location patterns. no duplication.

---

## verdict

**PASSED.** i verified each mechanism against actual codebase patterns:
- all changes extend extant patterns at their canonical locations
- no new utilities or abstractions introduced
- no duplicate mechanisms found
