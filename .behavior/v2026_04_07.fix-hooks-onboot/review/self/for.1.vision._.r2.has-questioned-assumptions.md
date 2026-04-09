# self-review r2: has-questioned-assumptions (deeper)

## critical finding: sync machinery is HARDCODED

**what I assumed in r1:**
- sync machinery iterates dynamically over role.hooks.onBrain
- if we add onTalk to the interface, it should "just work"

**what I found:**
- `syncOneRoleHooksIntoOneBrainRepl.ts` lines 96-132 has HARDCODED extraction:

```typescript
// extract onBoot hooks
for (const h of onBrain.onBoot ?? []) { ... }

// extract onTool hooks
for (const h of onBrain.onTool ?? []) { ... }

// extract onStop hooks
for (const h of onBrain.onStop ?? []) { ... }
```

**impact:**
- if we only add `onTalk` to the type interface, hooks declared as onTalk will be SILENTLY IGNORED
- the sync machinery won't see them, won't sync them, won't clean them up

**resolution:**
- implementation MUST also add onTalk extraction block to `extractDeclaredHooks`
- this is now a known implementation requirement, not a hidden assumption

**what this means for the vision:**
- vision correctly identifies "auto-sync on link" as a goal
- vision incorrectly assumes extant machinery handles it automatically
- fix: vision's "evaluation" section should note that sync machinery needs modification

---

## assumption: translateHook handles new events automatically

**what I assumed:**
- `translateHook.ts` uses a map that we can extend

**what I found:**
- yes, `EVENT_MAP` on line 23-27 is a simple record:

```typescript
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
};
```

**impact:**
- this is good — we just add `onTalk: 'UserPromptSubmit'` to the map
- BUT: this depends on BrainHookEvent type update first
- the chain is: BrainHookEvent type → EVENT_MAP → translateHook

**resolution:**
- implementation order matters: update BrainHookEvent type first, then translateHook

---

## assumption: opencode brain adapter doesn't need onTalk

**what I assumed:**
- vision focuses on claude code only
- opencode doesn't have a parallel event

**what I found:**
- `rhachet-brains-opencode` exists in src/_topublish/
- it has its own hook translation logic
- research doc mentions opencode has `session.created`, `tool.execute.before/after`, `session.idle`

**impact:**
- if opencode has a user-prompt-submit equivalent, we should support it
- if it doesn't, onTalk hooks will silently have no effect for opencode users

**what the vision should say:**
- either: "onTalk is claude-code-only" (explicit scope)
- or: research opencode for equivalent event

**resolution:**
- flag as open question for wisher: should onTalk work with opencode?

---

## assumption: ClaudeCodeSettings schema accepts UserPromptSubmit

**what I assumed:**
- we can add UserPromptSubmit to settings.json

**what I found:**
- `config.dao.ts` has `ClaudeCodeSettings` interface
- need to verify it accepts arbitrary event names or has hardcoded list

**impact:**
- if hardcoded, we need to update the schema
- if dynamic, we're good

**resolution:**
- verify at implementation time, likely needs schema update

---

## summary of r2 findings

| finding | impact | resolution |
|---------|--------|------------|
| sync machinery is hardcoded | critical | must add onTalk extraction block |
| translateHook uses extendable map | good | just add to map |
| opencode support unknown | medium | flag for wisher |
| settings schema may need update | medium | verify at implementation |

**vision update needed:**
- the vision's evaluation section claims "extant syncHooksForLinkedRoles handles it"
- this is INCORRECT — the sync machinery needs modification
- the vision should be updated to acknowledge this implementation requirement

---

## how I fixed the vision

### issue 1: vision claimed sync machinery "just works"

**before:**
```
| auto-sync on link | yes | extant syncHooksForLinkedRoles handles it |
```

**after:**
```
| auto-sync on link | yes | add onTalk extraction to syncOneRoleHooksIntoOneBrainRepl |
```

**what I added:**
- new "implementation notes" section that documents the hardcoded extraction pattern
- explicit list of 5 files that need modification

### issue 2: vision didn't ask about opencode scope

**before:** questions for wisher only asked about filter support and PostUserPromptSubmit

**after:** added question #3 about opencode scope

```
3. **opencode scope**: should `onTalk` also work for opencode brain? if so, what's the equivalent event? if not, is it acceptable that onTalk hooks are claude-code-only?
```

---

## non-issues that hold (verified)

### pruneOrphanedRoleHooks truly works without modification

**assumption tested:** "extant pruneOrphanedRoleHooks handles it (no change needed)"

**verification:**
- read `pruneOrphanedRoleHooksFromOneBrain.ts`
- function works by AUTHOR PATTERN matching, not by event type
- pattern: `rhachetAuthorPattern = /^repo=.+\/role=.+$/`
- orphan detection: `!authorsDesired.has(hook.author)`

**why it holds:**
- when a role is unlinked, its author (e.g., `repo=bhrain/role=achiever`) is removed from authorsDesired
- ALL hooks with that author are removed, regardless of event type
- if an achiever role declared onTalk hooks, they'd be removed like any other hook

**verdict:** this assumption is CORRECT, no change needed to prune logic ✓

---

### timeout is correctly marked as required

**assumption tested:** vision shows `timeout: IsoDuration;` (required)

**verification:**
- read `RoleHookOnBrain.ts`
- interface declares `timeout: IsoDuration;` (not optional)
- `filter?: BrainHookFilter;` is the only optional field

**why it holds:**
- claude code hooks require timeout to prevent runaway commands
- rhachet enforces this at the type level
- vision correctly shows timeout as required

**verdict:** correct ✓

---

### backwards compatibility is not a concern

**assumption tested:** we don't need to handle roles linked before onTalk support

**why it holds:**
- roles that don't declare onTalk simply have no onTalk hooks
- sync machinery only syncs what's declared
- no "migration" needed — absence of declaration = absence of hooks

**verdict:** correct, not a concern ✓

---

## verification: vision is now accurate

re-read the vision after edits:
- evaluation section now accurately describes implementation requirements
- open questions now include opencode scope
- assumptions are explicitly flagged for research
- prune logic verified to work without modification

**issues found: 2**
1. sync machinery hardcoded → fixed by adding implementation notes
2. opencode scope not questioned → fixed by adding question #3

**non-issues verified: 3**
1. prune logic works without modification → verified via code read
2. timeout correctly marked required → verified via interface read
3. backwards compat not needed → verified via reasoning

**verdict:** vision is updated and accurate. all assumptions questioned.
