# self-review r10: has-behavior-declaration-coverage

## what i reviewed

i opened the vision, criteria, and blueprint side-by-side. i traced each requirement line-by-line to verify the blueprint declares a change that fulfills it.

---

## vision requirements traceability

the vision declares 6 implementation requirements in the "implementation scope" section. i verify each against the blueprint's filediff tree and codepath tree.

### requirement 1: `BrainHookEvent` type — add `'onTalk'`

**vision says:** add `'onTalk'` to the BrainHookEvent union type.

**blueprint declares:**
- filediff tree: `[~] BrainHookEvent.ts` with comment "add 'onTalk' to union"
- codepath tree: `BrainHookEvent` shows `[+] 'onTalk'` as new event type

**verified:** the blueprint explicitly declares this change. the filediff and codepath align.

### requirement 2: `RoleHooksOnBrain` interface — add `onTalk` property

**vision says:** add `onTalk` property to the interface.

**blueprint declares:**
- filediff tree: `[~] RoleHooksOnBrain.ts` with comment "add onTalk property + nested"
- codepath tree: interface shows `[+] onTalk?: RoleHookOnBrain[]` and static nested shows `[+] onTalk: RoleHookOnBrain`

**verified:** the blueprint declares both the interface property and the nested hydration entry. this matches the extant pattern for onBoot/onTool/onStop.

### requirement 3: `extractDeclaredHooks` — add onTalk extraction block

**vision says:** add extraction block for onTalk hooks.

**blueprint declares:**
- filediff tree: `[~] syncOneRoleHooksIntoOneBrainRepl.ts` with comment "add onTalk extraction block"
- codepath tree: extractDeclaredHooks shows `[+] for (const h of onBrain.onTalk ?? [])` as "add parallel block"

**verified:** the blueprint declares the for-loop block. the comment "add parallel block" confirms it follows the extant hardcoded pattern.

### requirement 4: claude code `EVENT_MAP` — add `onTalk: 'UserPromptSubmit'`

**vision says:** add the map entry for claude code translation.

**blueprint declares:**
- filediff tree: `[~] translateHook.ts` with comment "add onTalk → UserPromptSubmit map"
- codepath tree: EVENT_MAP shows `[+] onTalk: 'UserPromptSubmit'`
- codepath tree: translateHookFromClaudeCode shows `[~] handle UserPromptSubmit → onTalk`

**verified:** the blueprint declares both the forward map (onTalk → UserPromptSubmit) and the reverse lookup (UserPromptSubmit → onTalk).

### requirement 5: opencode adapter — add `onTalk: 'chat.message'` map

**vision says:** add the map for opencode plugin generation.

**blueprint declares:**
- filediff tree: `[~] config.dao.ts` (opencode) with comment "add onTalk regex + chat.message impl"
- codepath tree: parsePluginFileName shows `[~] regex: onBoot|onTool|onStop → onBoot|onTool|onStop|onTalk`
- codepath tree: getHookImplementation shows `[+] if (event === 'onTalk') → chat.message`

**verified:** the blueprint declares both the regex extension and the if-branch for chat.message output.

### requirement 6: `ClaudeCodeSettings` schema — add `UserPromptSubmit` event type

**vision says:** add UserPromptSubmit to the settings schema.

**blueprint declares:**
- filediff tree: `[~] config.dao.ts` (anthropic) with comment "add UserPromptSubmit to schema"
- codepath tree: ClaudeCodeSettings.hooks shows `[+] UserPromptSubmit?`

**verified:** the blueprint declares the schema extension.

---

## criteria usecases traceability

### usecase.1: declare onTalk in role and link

the criteria specifies 5 outcomes:

| criterion | blueprint section | why it holds |
|-----------|------------------|--------------|
| settings.json contains UserPromptSubmit hook | translateHook.ts EVENT_MAP + config.dao.ts schema | EVENT_MAP translates onTalk to UserPromptSubmit; schema accepts UserPromptSubmit entries |
| opencode plugin contains chat.message hook | config.dao.ts getHookImplementation | if-branch produces `chat: { message: ... }` output |
| hook command matches declared command | no change needed | extant translateHookToClaudeCode passes command through unchanged |
| hook timeout matches declared timeout | no change needed | extant translateHookToClaudeCode converts timeout unchanged |
| hook author is namespaced to role | no change needed | extant syncOneRoleHooksIntoOneBrainRepl sets author from role slug |

### usecase.2: unlink removes onTalk hook

the criteria specifies 3 outcomes:

| criterion | blueprint section | why it holds |
|-----------|------------------|--------------|
| settings.json no longer contains the hook | genBrainHooksAdapterForClaudeCode.ts del | codepath tree shows `[+] onTalk → ['UserPromptSubmit']` in del event map |
| opencode plugin is removed | config.dao.ts regex extension | regex now matches onTalk filenames for deletion |
| other roles' hooks remain untouched | no change needed | extant author namespace filters by role |

### usecase.3: hook fires on prompt submission

the criteria specifies 4 outcomes, all claude code runtime behavior:

| criterion | why no blueprint change needed |
|-----------|-------------------------------|
| hook command executes | claude code's responsibility after settings.json is correct |
| hook receives prompt content via stdin | claude code's UserPromptSubmit behavior |
| hook can emit output | claude code's hook output processor |
| hook can block prompt via non-zero exit | claude code's hook exit code handler |

rhachet's scope is sync, not runtime. once settings.json is correct (usecase.1), claude code handles execution.

### usecase.4: multiple onTalk hooks

| criterion | why it holds |
|-----------|--------------|
| all hooks are synced | extractDeclaredHooks iterates `onBrain.onTalk ?? []` — array iteration handles multiple |
| each hook has unique author namespace | extant author logic in syncOneRoleHooksIntoOneBrainRepl |

### usecase.5: onTalk alongside other hook types

| criterion | why it holds |
|-----------|--------------|
| all hook types are synced | parallel for-loops in extractDeclaredHooks process each event type |
| each hook type maps to correct brain event | EVENT_MAP contains all 4 entries |

---

## boundary conditions traceability

| condition | blueprint coverage | why it holds |
|-----------|-------------------|--------------|
| empty onTalk array | extractDeclaredHooks `?? []` | for-loop iterates empty array with no effect |
| onTalk not declared | extractDeclaredHooks `?? []` | undefined falls back to empty array |
| idempotent link | no change needed | extant upsert logic in sync prunes and re-adds |

---

## error cases traceability

| error case | why no blueprint change needed |
|------------|-------------------------------|
| invalid timeout | extant ISO duration validation in translateHook |
| command not found | claude code runtime error, not rhachet's scope |

---

## gaps found

none. every vision requirement maps to a filediff. every criteria outcome is either:
1. declared as a blueprint change, or
2. handled by extant code (no change needed), or
3. outside rhachet's scope (claude code runtime)

---

## verdict

**PASSED.** i traced each vision requirement to a specific filediff and codepath entry. i traced each criteria outcome to either a blueprint change or an explanation of why no change is needed. no gaps found.
