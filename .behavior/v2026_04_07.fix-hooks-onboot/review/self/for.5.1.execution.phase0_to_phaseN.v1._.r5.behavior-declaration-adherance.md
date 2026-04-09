# review: behavior-declaration-adherance (r5)

## verdict: adherent — implementation matches spec exactly

reviewed each modified file against vision, criteria, and blueprint. no deviations found.

---

## modified files vs spec

11 source files modified (verified via `git status`):

| file | blueprint says | implementation does | adherent? |
|------|---------------|---------------------|-----------|
| BrainHookEvent.ts | add 'onTalk' to union | `'onBoot' \| 'onTool' \| 'onStop' \| 'onTalk'` | yes |
| RoleHooksOnBrain.ts | add onTalk property + nested | interface has `onTalk?: RoleHookOnBrain[]`, nested has `onTalk: RoleHookOnBrain` | yes |
| syncOneRoleHooksIntoOneBrainRepl.ts | add extraction block | for-loop identical to onBoot/onTool/onStop | yes |
| syncOneRoleHooksIntoOneBrainRepl.test.ts | add test case | case4 tests onTalk extraction | yes |
| translateHook.ts | add EVENT_MAP entry | `onTalk: 'UserPromptSubmit'` | yes |
| translateHook.test.ts | add test cases | case8 + case9 for bidirectional translate | yes |
| config.dao.ts (anthropic) | add UserPromptSubmit schema | `UserPromptSubmit?: ClaudeCodeHookEntry[]` | yes |
| genBrainHooksAdapterForClaudeCode.ts | add del event map | `onTalk: ['UserPromptSubmit']` | yes |
| genBrainHooksAdapterForClaudeCode.test.ts | add del test case | tests onTalk deletion | yes |
| config.dao.ts (opencode) | add regex + chat.message | regex includes `onTalk`, getHookImplementation returns `chat: { message: ... }` | yes |
| config.dao.test.ts (opencode) | add test cases | case3 + case4 for parse and generate | yes |

---

## vision adherance — line-by-line

### vision: "onTalk maps to UserPromptSubmit"

**spec says:** claude code uses `UserPromptSubmit` event name

**implementation:**
```typescript
// translateHook.ts:27
onTalk: 'UserPromptSubmit',
```

**adherent:** yes — exact match

---

### vision: "onTalk maps to chat.message (opencode)"

**spec says:** opencode uses `chat.message` event

**implementation:**
```typescript
// config.dao.ts (opencode):120-126
if (event === 'onTalk') {
  return `    chat: {
    message: async () => {
      execSync(${JSON.stringify(command)}, ...);
    },
  },`;
}
```

**adherent:** yes — exact match

---

### vision: "filter.what not supported for onTalk"

**spec says:** UserPromptSubmit is a single event with no sub-events

**implementation:** translateHookToClaudeCode uses wildcard matcher for onTalk (falls through to default case which uses `filter?.what ?? '*'`). no special filter logic needed.

**adherent:** yes — correct behavior, no filter validation needed

---

## criteria adherance

### criteria: hook command matches declared command

**spec says:** command in Role declaration flows through to settings.json

**implementation:** BrainHook constructor receives `h.command` directly, translateHookToClaudeCode passes it through to entry.

**adherent:** yes — no transformation, direct passthrough

---

### criteria: hook timeout matches declared timeout

**spec says:** timeout in Role declaration flows through to settings.json

**implementation:** translateHookToClaudeCode converts IsoDuration to milliseconds via `toMilliseconds(hook.timeout)`.

**adherent:** yes — correct conversion applied

---

### criteria: hook author is namespaced to role

**spec says:** hooks get author from role for cleanup identification

**implementation:** syncOneRoleHooksIntoOneBrainRepl sets `author` from role namespace before extraction loop.

**adherent:** yes — author flows through correctly

---

## blueprint adherance

### blueprint: extraction loop structure

**spec prescribes:**
```typescript
for (const h of onBrain.onTalk ?? []) {
  hooks.push(new BrainHook({ author, event: 'onTalk', ... }));
}
```

**implementation matches:** verified at syncOneRoleHooksIntoOneBrainRepl.ts:135-145

**adherent:** yes — structurally identical to onBoot/onTool/onStop

---

### blueprint: del event map

**spec prescribes:** genBrainHooksAdapterForClaudeCode.del maps onTalk to UserPromptSubmit bucket

**implementation:** `onTalk: ['UserPromptSubmit']` in claudeEvents map

**adherent:** yes — enables cleanup on unlink

---

## deviations found

none. every file matches its blueprint specification exactly.

---

## why it holds

the implementation is purely additive:
- no refactors of extant code
- no new abstractions
- each change mirrors extant patterns for onBoot/onTool/onStop

this adherance was intentional — blueprint prescribed additive changes only.