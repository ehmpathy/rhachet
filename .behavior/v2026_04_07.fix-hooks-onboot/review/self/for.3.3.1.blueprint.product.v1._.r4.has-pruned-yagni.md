# self-review r4: has-pruned-yagni

## what i reviewed

i traced each component in the blueprint to its requirement in the vision or criteria. checked for extras that were not prescribed.

---

## component traceability

| component | traces to | minimum viable? |
|-----------|-----------|-----------------|
| BrainHookEvent + onTalk | vision req 1 "accept onTalk in hooks schema" | yes — single line: add `'onTalk'` to union |
| RoleHooksOnBrain.onTalk | vision req 1 "declare onTalk in Role.build" | yes — interface property + nested entry |
| RoleHooksOnBrain.nested | vision req 1, needed for domain-objects hydration | yes — single line in static nested |
| extractDeclaredHooks | vision req 3 "auto-sync on link" | yes — one for-loop parallel to extant pattern |
| EVENT_MAP + onTalk | vision req 2 "map to UserPromptSubmit" | yes — single line in map |
| translateHookFromClaudeCode | criteria usecase.1 "read hooks from settings" | yes — extant Object.entries handles it |
| ClaudeCodeSettings.UserPromptSubmit | vision req 2, TypeScript schema | yes — single property in interface |
| genBrainHooksAdapterForClaudeCode.ts del | criteria usecase.2 "unlink removes hook" | yes — extend ternary chain by one case |
| opencode parsePluginFileName | vision req 5 "support onTalk for opencode" | yes — add `\|onTalk` to regex |
| opencode getHookImplementation | vision req 5 "map to chat.message" | yes — one if-branch for onTalk |
| tests | verify each above component | yes — minimal cases per component |

---

## yagni checklist

### did we add abstraction "for future flexibility"?

**no.** the implementation follows extant patterns exactly:
- hardcoded for-loops (not dynamic iteration)
- hardcoded EVENT_MAP (not configuration)
- hardcoded if-chains (not lookup tables)

we deliberately chose to extend extant patterns rather than refactor for "elegance". the vision r3 review confirmed this: "to refactor would be scope creep."

### did we add features "while we're here"?

**no.** the scope is exactly:
- onTalk for claude code (UserPromptSubmit)
- onTalk for opencode (chat.message)

we did NOT add:
- filter.what support (vision confirmed: "no filter support for onTalk")
- PostUserPromptSubmit/onTalkAfter (vision confirmed: "no onTalkAfter")
- dynamic event iteration (would be refactor, not feature)
- EVENT_MAP export (option 1 chosen to avoid module couple)

### did we optimize before we knew it was needed?

**no.** all implementation choices are minimal:
- extend ternary rather than refactor to use EVENT_MAP (genBrainHooksAdapterForClaudeCode.ts)
- add regex alternative rather than restructure parse logic (opencode parsePluginFileName)
- add if-branch rather than create lookup table (opencode getHookImplementation)

---

## opencode scope verification

the vision explicitly records: "**opencode scope** [answered]: yes — support onTalk for opencode via chat.message event."

this was a wisher decision, not an assumption. if the wisher had said "no", the blueprint would not include opencode changes.

---

## verdict

**no YAGNI violations found.**

every component traces to an explicit requirement. no abstractions were added for flexibility. no features were added "while we're here". no optimizations were made prematurely.

the blueprint is minimal: 8 files, all single-line or single-block changes, that extend extant patterns without refactor.
