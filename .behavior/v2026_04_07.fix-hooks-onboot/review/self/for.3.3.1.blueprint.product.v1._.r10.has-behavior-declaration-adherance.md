# self-review r10: has-behavior-declaration-adherance

## what i reviewed

i read the blueprint line-by-line and verified each proposed change matches what the vision describes and satisfies the criteria correctly. i looked for deviations or misinterpretations.

---

## filediff tree adherance

### BrainHookEvent.ts

**blueprint proposes:** add `'onTalk'` to union

**vision says:** add `'onTalk'` to BrainHookEvent type

**adherance:** exact match. no deviation.

### RoleHooksOnBrain.ts

**blueprint proposes:** add `onTalk` property + nested

**vision says:** add `onTalk` property to interface

**adherance:** blueprint adds both interface property AND nested entry. this matches the extant pattern — onBoot/onTool/onStop all have both. the nested entry enables domain-objects hydration. no deviation.

### syncOneRoleHooksIntoOneBrainRepl.ts

**blueprint proposes:** add onTalk extraction block with for-loop

**vision says:** add onTalk extraction block

**adherance:** exact match. the for-loop is consistent with extant pattern (hardcoded, not dynamic). no deviation.

### translateHook.ts

**blueprint proposes:** add `onTalk: 'UserPromptSubmit'` to EVENT_MAP

**vision says:** add `onTalk: 'UserPromptSubmit'` to EVENT_MAP

**adherance:** exact match. no deviation.

### config.dao.ts (anthropic)

**blueprint proposes:** add `UserPromptSubmit?` to ClaudeCodeSettings.hooks

**vision says:** add `UserPromptSubmit` event type to ClaudeCodeSettings schema

**adherance:** exact match. optional property aligns with other events (all optional arrays). no deviation.

### genBrainHooksAdapterForClaudeCode.ts

**blueprint proposes:** extend ternary to add `onTalk → ['UserPromptSubmit']`

**vision says:** (implicit) — unlink must remove onTalk hooks

**criteria says:** usecase.2 requires settings.json no longer contains the hook after unlink

**adherance:** this addition is necessary for del to work. blueprint correctly identifies the need and proposes the right change. no deviation.

### config.dao.ts (opencode)

**blueprint proposes:** add `|onTalk` to regex + add `if (event === 'onTalk') → chat.message`

**vision says:** opencode adapter — add `onTalk: 'chat.message'` map

**adherance:** regex enables filename match; if-branch produces chat.message output. both are needed for opencode support. no deviation.

---

## codepath tree adherance

i verified each codepath entry matches the proposed filediff:

| codepath | proposed change | matches filediff? |
|----------|-----------------|-------------------|
| BrainHookEvent `[+] 'onTalk'` | add to union | ✓ |
| RoleHooksOnBrain interface `[+] onTalk?` | add property | ✓ |
| RoleHooksOnBrain nested `[+] onTalk` | add entry | ✓ |
| extractDeclaredHooks `[+] for onTalk` | add loop | ✓ |
| EVENT_MAP `[+] onTalk: 'UserPromptSubmit'` | add entry | ✓ |
| translateHookFromClaudeCode `[~] handle UserPromptSubmit` | reverse lookup | ✓ |
| ClaudeCodeSettings.hooks `[+] UserPromptSubmit?` | add schema | ✓ |
| genBrainHooksAdapter del `[+] onTalk` | extend ternary | ✓ |
| parsePluginFileName `[~] regex` | add alternative | ✓ |
| getHookImplementation `[+] if onTalk` | add branch | ✓ |

all codepaths align with their filediffs.

---

## test tree adherance

i verified each test case tests what the codepath declares:

| test case | tests what? | aligns with codepath? |
|-----------|-------------|----------------------|
| translateHook.test.ts [case9] onTalk hook | EVENT_MAP forward lookup | ✓ |
| translateHook.test.ts [case8] UserPromptSubmit entry | reverse lookup | ✓ |
| genBrainHooksAdapterForClaudeCode.test.ts [caseN] del onTalk | del event map | ✓ |
| syncOneRoleHooksIntoOneBrainRepl.test.ts [case4] role with onTalk | extractDeclaredHooks | ✓ |
| config.dao.test.ts [case3] valid onTalk filename | parsePluginFileName | ✓ |
| config.dao.test.ts [case4] onTalk hook | generatePluginContent | ✓ |

all tests align with their codepaths.

---

## implementation order adherance

the blueprint proposes:

1. BrainHookEvent.ts — type first (other files depend on it)
2. RoleHooksOnBrain.ts — interface second (extant code needs type)
3. syncOneRoleHooksIntoOneBrainRepl.ts — extraction third
4. translateHook.ts — translation fourth
5. config.dao.ts (anthropic) — schema fifth
6. genBrainHooksAdapterForClaudeCode.ts — del sixth
7. config.dao.ts (opencode) — opencode seventh
8. tests — all test extensions in parallel

this order respects dependencies:
- type must exist before interface uses it
- interface must exist before extraction uses it
- extraction and translation can be parallel
- tests can be parallel with each other

no deviation from logical dependency order.

---

## deviations found

none. the blueprint:
- matches vision requirements exactly
- satisfies criteria usecases correctly
- follows extant patterns
- maintains logical dependency order

---

## verdict

**PASSED.** the blueprint adheres to the behavior declaration. no misinterpretations or deviations found.
