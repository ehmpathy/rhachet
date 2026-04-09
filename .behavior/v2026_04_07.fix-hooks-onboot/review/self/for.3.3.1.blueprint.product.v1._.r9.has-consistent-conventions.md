# self-review r9: has-consistent-conventions

## what i reviewed

i searched the codebase for name patterns and verified each name choice against extant conventions.

---

## codebase search: event name patterns

searched for `onBoot|onTool|onStop` in domain.objects/

**results:**

BrainHookEvent.ts (lines 6-10):
```typescript
*   - onBoot → SessionStart (claudecode), session.created (opencode)
*   - onTool → PreToolUse/PostToolUse (claudecode), tool.execute.before/after (opencode)
*   - onStop → Stop (claudecode), session.idle (opencode)

export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';
```

RoleHooksOnBrain.ts (lines 10-12, 20-22):
```typescript
onBoot?: RoleHookOnBrain[];
onTool?: RoleHookOnBrain[];
onStop?: RoleHookOnBrain[];
// ...
onBoot: RoleHookOnBrain,
onTool: RoleHookOnBrain,
onStop: RoleHookOnBrain,
```

---

## name-by-name verification

### 1. rhachet event name: `onTalk`

**extant pattern:** `on` + verb-like noun
- `onBoot` (boot = startup)
- `onTool` (tool = tool use)
- `onStop` (stop = shutdown)

**proposed:** `onTalk` (talk = user prompt)

**semantic fit:** "talk" describes user-to-brain communication. when user "talks" to the brain, the hook fires.

**consistent:** yes — `on` prefix + verb-like noun.

---

### 2. interface property pattern

**extant:**
```typescript
onBoot?: RoleHookOnBrain[];
```

**proposed:**
```typescript
onTalk?: RoleHookOnBrain[];
```

**consistent:** yes — same type, same optional modifier.

---

### 3. nested map entry pattern

**extant:**
```typescript
static nested = {
  onBoot: RoleHookOnBrain,
  onTool: RoleHookOnBrain,
  onStop: RoleHookOnBrain,
};
```

**proposed:**
```typescript
onTalk: RoleHookOnBrain,
```

**consistent:** yes — same pattern.

---

### 4. claude code event name: `UserPromptSubmit`

**extant documentation in BrainHookEvent.ts:**
```
- onBoot → SessionStart
- onTool → PreToolUse
- onStop → Stop
```

**proposed:**
```
- onTalk → UserPromptSubmit
```

**note:** BrainHookEvent.ts has a comment that documents these event maps. the blueprint should update this comment when it adds onTalk.

**observation:** the filediff tree says "add 'onTalk' to union" — this implies the comment should also be updated. in execution, include the comment update.

**consistent:** yes — follows extant comment pattern (rhachet event → claude code event).

---

### 5. opencode event name: `chat.message`

**extant documentation:**
```
- onBoot → session.created
- onTool → tool.execute.before
- onStop → session.idle
```

**proposed:**
```
- onTalk → chat.message
```

**consistent:** yes — follows extant opencode hook name pattern.

---

### 6. test case labels

**extant pattern (from research):**
```
given('[case1] onBoot hook')
given('[case5] SessionStart entry')
```

**proposed:**
```
given('[case9] onTalk hook')
given('[case8] UserPromptSubmit entry')
```

**consistent:** yes — same `[caseN]` prefix + descriptive suffix.

---

## divergence check

| name | pattern | follows? | notes |
|------|---------|----------|-------|
| onTalk | on + verb-noun | yes | parallel to onBoot, onTool, onStop |
| onTalk property | optional array | yes | same type as others |
| onTalk nested | class reference | yes | same pattern as others |
| UserPromptSubmit | claude code official | yes | official event name |
| chat.message | opencode official | yes | official hook name |
| test labels | [caseN] descriptor | yes | follows extant pattern |

---

## observation for execution

BrainHookEvent.ts has a JSDoc comment (lines 6-8) that documents event maps. when the code is written, also update this comment to include:
```
*   - onTalk → UserPromptSubmit (claudecode), chat.message (opencode)
```

---

## verdict

**PASSED.** all names follow extant conventions:
- `onTalk` follows the `on` + verb-noun pattern used by extant events
- external event names use official API names
- test labels follow extant `[caseN]` pattern
- no new terms introduced where extant terms exist

**note for execution:** update BrainHookEvent.ts comment to include onTalk event map.
