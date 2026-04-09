# self-review r11: has-behavior-declaration-adherance

## what i reviewed

i read the actual source files referenced by the blueprint. i verified each proposed change adheres to the vision and follows extant patterns.

---

## source verification

### BrainHookEvent.ts (lines 1-11)

**current code:**
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';
```

**blueprint proposes:** add `'onTalk'` to union

**vision says:** add `'onTalk'` to BrainHookEvent type

**adherance verified:**
- blueprint's `[+] 'onTalk'` matches vision exactly
- proposed change follows the extant union pattern
- no misinterpretation

**note:** BrainHookEvent.ts has a JSDoc comment (lines 5-8) that documents event maps. the blueprint should update this comment to include `onTalk → UserPromptSubmit (claudecode), chat.message (opencode)`. i verified the r9 review noted this — it will be done in execution.

### RoleHooksOnBrain.ts (lines 1-25)

**current code:**
```typescript
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
}

public static nested = {
  onBoot: RoleHookOnBrain,
  onTool: RoleHookOnBrain,
  onStop: RoleHookOnBrain,
};
```

**blueprint proposes:** add `onTalk?: RoleHookOnBrain[]` to interface + `onTalk: RoleHookOnBrain` to nested

**vision says:** add `onTalk` property to interface

**adherance verified:**
- blueprint adds both interface property AND nested entry
- this matches extant pattern — all three events have both
- nested entry is necessary for domain-objects hydration
- vision says "add property" — blueprint adds property + nested which is correct and complete
- no deviation

### syncOneRoleHooksIntoOneBrainRepl.ts (lines 94-124)

**current code pattern:**
```typescript
// extract onBoot hooks
for (const h of onBrain.onBoot ?? []) { hooks.push(new BrainHook({...})); }

// extract onTool hooks
for (const h of onBrain.onTool ?? []) { hooks.push(new BrainHook({...})); }

// extract onStop hooks
for (const h of onBrain.onStop ?? []) { hooks.push(new BrainHook({...})); }
```

**blueprint proposes:** add parallel for-loop for onTalk

**vision says:** add onTalk extraction block

**adherance verified:**
- blueprint's `[+] for (const h of onBrain.onTalk ?? [])` matches extant pattern exactly
- hardcoded for-loop (not dynamic iteration) is the correct approach
- comment "add parallel block" confirms this approach
- no deviation

---

## key adherance check: translateHook EVENT_MAP

the blueprint proposes to add `onTalk: 'UserPromptSubmit'` to EVENT_MAP.

**vision says:**
- claude code `EVENT_MAP` — add `onTalk: 'UserPromptSubmit'`

**criteria usecase.1 says:**
- settings.json contains UserPromptSubmit hook for claude code

**adherance verified:**
- EVENT_MAP entry enables the translation
- translateHookToClaudeCode uses EVENT_MAP to produce the config
- this directly satisfies the criteria outcome
- no misinterpretation

---

## key adherance check: genBrainHooksAdapterForClaudeCode del

the blueprint proposes to extend the ternary to handle onTalk → UserPromptSubmit.

**criteria usecase.2 says:**
- unlink removes onTalk hook
- settings.json no longer contains the hook

**adherance verified:**
- del function uses claudeEvents to identify which buckets to clean
- onTalk → ['UserPromptSubmit'] enables cleanup of UserPromptSubmit entries
- this directly satisfies the criteria outcome
- no deviation

---

## key adherance check: opencode chat.message

the blueprint proposes:
1. add `|onTalk` to parsePluginFileName regex
2. add `if (event === 'onTalk') → chat.message` to getHookImplementation

**vision says:**
- opencode adapter — add `onTalk: 'chat.message'` map

**criteria usecase.1 says:**
- opencode plugin contains chat.message hook

**adherance verified:**
- regex enables filename match for onTalk plugins
- if-branch produces `chat: { message: ... }` output
- both changes together fulfill the vision and criteria
- no misinterpretation

---

## observation: JSDoc update not explicit in blueprint

the r9 has-consistent-conventions review noted that BrainHookEvent.ts has a JSDoc comment that documents event maps:

```typescript
*   - onBoot → SessionStart (claudecode), session.created (opencode)
*   - onTool → PreToolUse/PostToolUse (claudecode), tool.execute.before/after (opencode)
*   - onStop → Stop (claudecode), session.idle (opencode)
```

this should be updated to include:
```typescript
*   - onTalk → UserPromptSubmit (claudecode), chat.message (opencode)
```

**assessment:** the r9 review explicitly noted this as "observation for execution." the blueprint's filediff tree shows `[~] BrainHookEvent.ts` which covers this file. in execution, the implementer should include the JSDoc update. this is not a gap — it's noted and will be done.

---

## deviations found

none. i verified:
1. BrainHookEvent.ts change adheres to vision
2. RoleHooksOnBrain.ts change is complete (interface + nested)
3. extractDeclaredHooks pattern is followed exactly
4. EVENT_MAP entry satisfies criteria
5. del ternary enables unlink cleanup
6. opencode changes fulfill both vision and criteria
7. JSDoc update is noted for execution

---

## verdict

**PASSED.** the blueprint adheres to the behavior declaration. each proposed change matches what the vision describes and satisfies the criteria correctly. no misinterpretations found.
