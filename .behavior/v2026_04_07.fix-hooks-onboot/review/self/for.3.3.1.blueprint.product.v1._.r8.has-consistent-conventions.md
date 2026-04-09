# self-review r8: has-consistent-conventions

## what i reviewed

i audited each name choice in the blueprint against extant conventions in the codebase.

---

## name convention audit

### 1. event name: `onTalk`

**extant pattern:**
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';
```

**pattern:** `on` + capitalized noun (Boot, Tool, Stop)

**proposed:** `onTalk`

**consistent:** yes — follows `on` + capitalized noun pattern.

---

### 2. interface property: `onTalk?: RoleHookOnBrain[]`

**extant pattern:**
```typescript
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
}
```

**pattern:** optional array property, same name as event type

**proposed:** `onTalk?: RoleHookOnBrain[]`

**consistent:** yes — follows extant interface property pattern.

---

### 3. claude code event name: `UserPromptSubmit`

**source:** claude code's official API

**extant usage:** rhachet uses claude code's official event names:
- `SessionStart`
- `PreCompact`
- `PostCompact`
- `PreToolUse`
- `PostToolUse`
- `Stop`

**proposed:** `UserPromptSubmit`

**consistent:** yes — official claude code event name.

---

### 4. opencode event name: `chat.message`

**source:** opencode's official plugin API

**extant usage:** rhachet uses opencode's official hook names:
- `session.created`
- `tool.execute.before`
- `session.idle`

**proposed:** `chat.message`

**consistent:** yes — official opencode hook name (verified in opencode docs).

---

### 5. test case labels

**extant pattern (from translateHook.test.ts):**
```
given('[case1] onBoot hook')
given('[case5] SessionStart entry')
```

**proposed (from blueprint test tree):**
```
given('[case9] onTalk hook')
given('[case8] UserPromptSubmit entry')
```

**consistent:** yes — follows `[caseN] <event> hook/entry` pattern.

---

### 6. file names

**extant pattern:** test files use same base name + `.test.ts` suffix
- `translateHook.ts` → `translateHook.test.ts`
- `config.dao.ts` → `config.dao.test.ts`

**proposed:** follows same pattern — no new files, only updates

**consistent:** yes — no new file names introduced.

---

## divergence check

| name | extant convention | blueprint uses | diverges? |
|------|------------------|----------------|-----------|
| onTalk | on + capitalized noun | onTalk | no |
| onTalk property | optional array | onTalk?: RoleHookOnBrain[] | no |
| UserPromptSubmit | claude code official | UserPromptSubmit | no |
| chat.message | opencode official | chat.message | no |
| test labels | [caseN] event hook/entry | [case9] onTalk hook | no |

---

## verdict

**PASSED.** all names in the blueprint follow extant conventions:
- rhachet event names: `on` + capitalized noun pattern
- external event names: official API names from claude code and opencode
- test labels: extant `[caseN]` pattern
- no new terms introduced where extant terms exist
