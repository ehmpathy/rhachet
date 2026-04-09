# self-review r1: has-research-traceability

## what i reviewed

i opened and re-read both research artifacts line by line:
- `.behavior/v2026_04_07.fix-hooks-onboot/3.1.3.research.internal.product.code.prod._.v1.i1.md`
- `.behavior/v2026_04_07.fix-hooks-onboot/3.1.3.research.internal.product.code.test._.v1.i1.md`

then i traced each recommendation through the blueprint to verify coverage.

---

## production code research → blueprint traceability

### recommendation 1: BrainHookEvent — add `'onTalk'`

**research said:** the type union only has `'onBoot' | 'onTool' | 'onStop'` and must add `'onTalk'`.

**blueprint reflects:** yes, in the codepath tree under domain.objects, `[+] 'onTalk'` is listed as a new member of the BrainHookEvent union.

**why it holds:** the research identified this as the foundational type that all other code depends on. without this, the TypeScript compiler would reject any usage of `'onTalk'` in the codebase. the blueprint correctly places it first in the implementation order.

---

### recommendation 2: RoleHooksOnBrain interface — add `onTalk`

**research said:** the interface needs `onTalk?: RoleHookOnBrain[]` to allow Role.build to accept onTalk hooks.

**blueprint reflects:** yes, in the codepath tree under RoleHooksOnBrain → interface, `[+] onTalk?: RoleHookOnBrain[]` is listed.

**why it holds:** this is the contract that developers use to declare hooks in Role.build. without this property, TypeScript would error on any role that tries to declare onTalk hooks.

---

### recommendation 3: RoleHooksOnBrain nested — add `onTalk`

**research said:** the static nested map needs `onTalk: RoleHookOnBrain` for domain-objects hydration.

**blueprint reflects:** yes, in the codepath tree under RoleHooksOnBrain → static nested, `[+] onTalk: RoleHookOnBrain` is listed.

**why it holds:** domain-objects uses the nested map for automatic hydration of nested objects. without this entry, onTalk hooks would not be properly instantiated as RoleHookOnBrain instances.

---

### recommendation 4: extractDeclaredHooks — add onTalk block

**research said:** the function uses hardcoded for-loops for each event type, must add a parallel block for onTalk.

**blueprint reflects:** yes, in the codepath tree under extractDeclaredHooks, `[+] for (const h of onBrain.onTalk ?? [])` is listed.

**why it holds:** this is the critical extraction logic that transforms role declarations into BrainHook instances. the research correctly identified that this is NOT dynamic — it's hardcoded per event type. to add onTalk requires another for-loop block.

---

### recommendation 5: EVENT_MAP — add `onTalk: 'UserPromptSubmit'`

**research said:** the EVENT_MAP in translateHook.ts maps rhachet events to claude code events, must add onTalk.

**blueprint reflects:** yes, in the codepath tree under claude code adapter → EVENT_MAP, `[+] onTalk: 'UserPromptSubmit'` is listed.

**why it holds:** this is the translation layer that converts rhachet's event names to claude code's event names. the research noted that extant logic for onTool/onStop (wildcard matcher) applies to onTalk.

---

### recommendation 6: ClaudeCodeSettings — add `UserPromptSubmit`

**research said:** the ClaudeCodeSettings interface must add `UserPromptSubmit?: ClaudeCodeHookEntry[]`.

**blueprint reflects:** yes, in the codepath tree under config.dao.ts (anthropic) → ClaudeCodeSettings.hooks, `[+] UserPromptSubmit?` is listed.

**why it holds:** this is the TypeScript schema for claude code's settings.json. without this property, the compiler would reject any attempt to read or write UserPromptSubmit hooks from/to settings.json.

---

### recommendation 7: parsePluginFileName — add onTalk to regex

**research said:** the regex pattern `/^rhachet-(.+)-(onBoot|onTool|onStop)-/` must add `onTalk`.

**blueprint reflects:** yes, in the codepath tree under opencode adapter → parsePluginFileName, `[~] regex: onBoot|onTool|onStop → onBoot|onTool|onStop|onTalk` is listed.

**why it holds:** this regex determines which filenames are recognized as rhachet-managed plugins. without onTalk in the pattern, the parser would return null for onTalk plugin files, which would break the read/delete operations.

---

### recommendation 8: getHookImplementation — add onTalk case

**research said:** the function needs an if-branch for onTalk that maps to `chat.message`.

**blueprint reflects:** yes, in the codepath tree under opencode adapter → getHookImplementation, `[+] if (event === 'onTalk') → chat.message` is listed.

**why it holds:** this function generates the actual opencode plugin TypeScript code. without the onTalk case, the function would fall through to the "unknown event" fallback comment.

---

## test code research → blueprint traceability

### recommendation 1: translateHookToClaudeCode — add onTalk test

**research said:** mirror extant tests like `[case3] onStop hook` for onTalk.

**blueprint reflects:** yes, in the test tree under translateHook.test.ts, `[+] given('[case9] onTalk hook')` is listed.

**why it holds:** the test pattern is already established — given a hook with event 'onTalk', when translated, then event should be 'UserPromptSubmit'. this mirrors the onStop test exactly.

---

### recommendation 2: translateHookFromClaudeCode — add UserPromptSubmit test

**research said:** mirror extant tests like `[case1] SessionStart entry` for UserPromptSubmit.

**blueprint reflects:** yes, in the test tree under translateHook.test.ts, `[+] given('[case8] UserPromptSubmit entry')` is listed.

**why it holds:** the reverse translation must also be tested — given a UserPromptSubmit entry, when translated, then event should be 'onTalk'. this mirrors the SessionStart test exactly.

---

### recommendation 3: syncOneRoleHooksIntoOneBrainRepl — add onTalk test

**research said:** mirror extant tests like `[case1] role with onBoot hooks` for onTalk.

**blueprint reflects:** yes, in the test tree under syncOneRoleHooksIntoOneBrainRepl.test.ts, `[+] given('[case4] role with onTalk hooks')` is listed.

**why it holds:** the sync operation must be tested with a role that declares onTalk hooks to verify the extraction block works correctly.

---

### recommendation 4: parsePluginFileName — add onTalk filename test

**research said:** add test to verify onTalk filenames are recognized.

**blueprint reflects:** yes, in the test tree under config.dao.test.ts, `[+] given('[case3] valid onTalk filename')` is listed.

**why it holds:** after the regex is updated, we must verify it accepts onTalk filenames and returns the correct author and event.

---

### recommendation 5: generatePluginContent — add onTalk test

**research said:** add test to verify onTalk generates chat.message hook content.

**blueprint reflects:** yes, in the test tree under config.dao.test.ts, `[+] given('[case4] onTalk hook')` is listed.

**why it holds:** the generated plugin content must be tested to ensure it contains the correct opencode hook structure (chat.message).

---

## omissions

none. all 13 research recommendations (8 prod + 5 test) are reflected in the blueprint.

---

## verdict

**research traceability holds.**

every recommendation from both research artifacts is present in the blueprint:
- filediff tree lists all 7 files to modify
- codepath tree shows all 8 production code changes
- test tree shows all 5 test additions

no research was silently ignored. no recommendations were omitted without rationale.
