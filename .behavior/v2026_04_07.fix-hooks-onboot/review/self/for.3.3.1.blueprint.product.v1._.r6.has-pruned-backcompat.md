# self-review r6: has-pruned-backcompat

## what i reviewed

i did a deep review for backwards-compat patterns, guided by the repo's zero-backcompat principle from memory:

> **ZERO BACKCOMPAT**
> when you remove deprecated code, patterns, or names:
> - delete completely — no migration maps
> - no transforms to convert old → new
> - no legacy aliases in enums or types
> - no "for backwards compat" comments

---

## file-by-file backwards-compat audit

### BrainHookEvent.ts

**change:** add `'onTalk'` to union

**backcompat patterns to check:**
- legacy aliases? no — we add a new member, not an alias for an old one
- migration from old name? no — 'onTalk' is new, no old name to migrate from
- comments about backwards compat? no

**verdict:** no backcompat

---

### RoleHooksOnBrain.ts

**change:** add `onTalk?: RoleHookOnBrain[]` + nested entry

**backcompat patterns to check:**
- optional to avoid break? the `?` is semantic (hooks are optional), not backcompat
- migration from old property name? no — onTalk is new
- comments about backwards compat? no

**verdict:** no backcompat

---

### syncOneRoleHooksIntoOneBrainRepl.ts

**change:** add onTalk extraction for-loop

**backcompat patterns to check:**
- migration of old hook data? no — onTalk has no legacy data
- fallback for old format? no — we extract onTalk directly
- comments about backwards compat? no

**verdict:** no backcompat

---

### translateHook.ts

**change:** add EVENT_MAP entry `onTalk: 'UserPromptSubmit'`

**backcompat patterns to check:**
- migration map from old event names? no — onTalk is new
- legacy aliases in EVENT_MAP? no — each event has exactly one entry
- reverse lookup fallback? no — if not found, returns empty array (line 105)
- comments about backwards compat? checked line 108 — that comment is about SessionStart sub-events, not about onTalk

**special check:** does translateHookFromClaudeCode need to handle old UserPromptSubmit hooks?
- no — the achiever role's workaround used direct jq injection into settings.json
- those hooks don't have rhachet author patterns
- they won't be recognized as rhachet-managed hooks
- prune won't touch them
- this is correct — we don't need migration

**verdict:** no backcompat

---

### config.dao.ts (anthropic)

**change:** add `UserPromptSubmit?: ClaudeCodeHookEntry[]` to schema

**backcompat patterns to check:**
- optional to avoid break? yes, but all event types are optional — this is the schema pattern, not backcompat
- migration of old property? no — UserPromptSubmit is new to our schema

**verdict:** no backcompat

---

### genBrainHooksAdapterForClaudeCode.ts

**change:** extend ternary to handle onTalk in del function

**backcompat patterns to check:**
- fallback for unknown events? the extant code falls through to 'Stop' for unknown events. this is not backcompat, it's a bug that our change doesn't address (out of scope).
- migration code? no

**verdict:** no backcompat

---

### config.dao.ts (opencode)

**change:** add `|onTalk` to regex, add chat.message if-branch

**backcompat patterns to check:**
- migration of old plugin files? no — onTalk plugins don't exist yet
- fallback for old format? no — we parse new format only
- comments about backwards compat? no

**verdict:** no backcompat

---

## achiever role workaround migration

**question:** should we migrate the achiever role's workaround hooks?

**analysis:**
- current workaround: jq injects UserPromptSubmit hook directly into settings.json
- new approach: rhachet syncs onTalk hooks with author namespace
- these are different hooks (different author field)
- they can coexist temporarily
- when achiever role updates to use onTalk, the init workaround can be deleted
- no migration code needed in rhachet

**verdict:** no migration needed — achiever role is responsible for its own update

---

## open questions for wisher

**none.** no backwards-compat code exists in the blueprint. no migration is needed.

---

## verdict

**no backwards-compat concerns found.**

the implementation follows the repo's zero-backcompat principle:
- no migration maps
- no transforms from old → new
- no legacy aliases
- no "for backwards compat" comments

onTalk is a new feature. there is no old data to migrate. the achiever role's workaround will coexist until that role updates to use the new onTalk hook.
