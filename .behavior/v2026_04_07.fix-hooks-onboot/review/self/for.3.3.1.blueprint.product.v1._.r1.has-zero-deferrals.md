# self-review r1: has-zero-deferrals

## what i reviewed

i searched the blueprint for any items marked as:
- "deferred"
- "future work"
- "out of scope"
- "later"
- "not included"

then i compared against the vision requirements to ensure every promised item is in the blueprint.

---

## search for deferrals

i grep'd the blueprint for deferral markers:

- "deferred" — **not found**
- "future" — **not found**
- "out of scope" — **not found**
- "later" — **not found**
- "not included" — **not found**

the blueprint contains no deferral markers.

---

## vision requirements → blueprint coverage

### requirement 1: declare onTalk in Role.build

**vision said:** "the developer declares the hook directly in their role"

**blueprint covers:**
- `BrainHookEvent` adds `'onTalk'`
- `RoleHooksOnBrain` adds `onTalk?: RoleHookOnBrain[]`
- `RoleHooksOnBrain.nested` adds `onTalk: RoleHookOnBrain`

**verdict:** fully covered

---

### requirement 2: map onTalk to UserPromptSubmit

**vision said:** "map onTalk to UserPromptSubmit in settings.json generation"

**blueprint covers:**
- `EVENT_MAP` adds `onTalk: 'UserPromptSubmit'`
- `ClaudeCodeSettings.hooks` adds `UserPromptSubmit?`
- `translateHookToClaudeCode` uses EVENT_MAP (no change needed)
- `translateHookFromClaudeCode` handles UserPromptSubmit → onTalk

**verdict:** fully covered

---

### requirement 3: auto-sync on link

**vision said:** "rhachet roles link --role myrole syncs hook to settings.json automatically"

**blueprint covers:**
- `extractDeclaredHooks` adds onTalk extraction block

**verdict:** fully covered (sync uses extant machinery, just adds extraction)

---

### requirement 4: auto-cleanup on unlink

**vision said:** "unlink removes it"

**blueprint does not explicitly add this** — however, the vision notes state:

> "auto-cleanup on unlink: yes — extant pruneOrphanedRoleHooks handles it (no change needed)"

this was already analyzed in the vision. the extant pruneOrphanedRoleHooks function compares declared hooks vs configured hooks and removes orphans. since onTalk hooks will be extracted by the new block, they will be tracked and cleaned up by the extant logic.

**verdict:** covered via extant code (no new code needed)

---

### requirement 5: opencode support

**vision said:** "support onTalk for opencode via chat.message event"

**blueprint covers:**
- `parsePluginFileName` regex adds `onTalk`
- `getHookImplementation` adds onTalk → chat.message case

**verdict:** fully covered

---

## omissions

none. the blueprint includes all vision requirements:
1. Role.build accepts onTalk ✓
2. claude code adapter maps to UserPromptSubmit ✓
3. sync extracts onTalk hooks ✓
4. cleanup uses extant logic (no new code needed) ✓
5. opencode adapter maps to chat.message ✓

---

## verdict

**zero deferrals.**

the blueprint contains no deferral markers and covers all five vision requirements. the only item without new code (cleanup) was explicitly marked as "no change needed" in the vision's evaluation section.
