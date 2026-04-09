# self-review r7: has-consistent-mechanisms

## what i reviewed

i audited each mechanism in the blueprint to verify it reuses extant patterns rather than duplicates.

---

## mechanism audit

### 1. BrainHookEvent type extension

**proposed:** add `'onTalk'` to union type

**extant pattern:**
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';
```

**uses extant pattern:** yes — adds one more union member, same as how onBoot, onTool, onStop are declared.

---

### 2. RoleHooksOnBrain interface extension

**proposed:** add `onTalk?: RoleHookOnBrain[]` property + nested entry

**extant pattern:**
```typescript
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
}
```

**uses extant pattern:** yes — adds one more optional property with the same type as others.

---

### 3. extractDeclaredHooks onTalk block

**proposed:** add for-loop for onTalk hooks

**extant pattern:**
```typescript
for (const h of onBrain.onBoot ?? []) { ... }
for (const h of onBrain.onTool ?? []) { ... }
for (const h of onBrain.onStop ?? []) { ... }
```

**uses extant pattern:** yes — adds parallel hardcoded for-loop. no new abstraction introduced.

**note:** could refactor to dynamic iteration, but that would be scope creep. vision r3 confirmed: "to refactor would be scope creep."

---

### 4. EVENT_MAP entry

**proposed:** add `onTalk: 'UserPromptSubmit'`

**extant pattern:**
```typescript
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
};
```

**uses extant pattern:** yes — adds one more entry to extant map.

---

### 5. ClaudeCodeSettings schema

**proposed:** add `UserPromptSubmit?: ClaudeCodeHookEntry[]`

**extant pattern:**
```typescript
hooks: {
  SessionStart?: ClaudeCodeHookEntry[];
  PreCompact?: ClaudeCodeHookEntry[];
  PostCompact?: ClaudeCodeHookEntry[];
  PreToolUse?: ClaudeCodeHookEntry[];
  PostToolUse?: ClaudeCodeHookEntry[];
  Stop?: ClaudeCodeHookEntry[];
}
```

**uses extant pattern:** yes — adds one more optional event property.

---

### 6. genBrainHooksAdapterForClaudeCode del event map

**proposed:** extend ternary to handle onTalk

**extant pattern:** ternary chain maps events to claude code bucket names

**uses extant pattern:** yes — extends extant ternary. no new mechanism.

---

### 7. opencode config.dao changes

**proposed:** add `|onTalk` to regex + add chat.message if-branch

**extant pattern:**
```typescript
// regex
const regex = /^author=(.+)\.event=(onBoot|onTool|onStop)\.sh$/;

// if-branches
if (event === 'onBoot') return { hook: 'session.created' };
if (event === 'onTool') return { hook: 'tool.execute.before' };
if (event === 'onStop') return { hook: 'session.idle' };
```

**uses extant pattern:** yes — adds one more regex alternative and one more if-branch.

---

## duplicate mechanism check

| new mechanism | duplicates extant? | resolution |
|---------------|-------------------|------------|
| type extension | no | union extension pattern |
| interface property | no | optional property pattern |
| for-loop block | no | hardcoded iteration pattern |
| EVENT_MAP entry | no | record extension pattern |
| schema property | no | optional event pattern |
| ternary case | no | ternary chain pattern |
| regex + if-branch | no | regex alternative + if-branch pattern |

---

## verdict

**PASSED.** all mechanisms in the blueprint extend extant patterns. no new utilities or abstractions are introduced. the implementation is consistent with how the codebase already handles hook events.
