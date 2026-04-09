# self-review: has-questioned-assumptions

## assumption 1: extant sync machinery will handle onTalk

**what do we assume?**
- `syncHooksForLinkedRoles` will sync onTalk hooks without modification
- `pruneOrphanedRoleHooks` will clean up onTalk hooks on unlink

**what evidence supports this?**
- sync machinery iterates over hook events from the role definition
- if we add onTalk to RoleHooksOnBrain interface, it should become visible to sync

**what if the opposite were true?**
- sync machinery might have hardcoded event lists
- need to verify sync logic iterates dynamically, not over hardcoded list

**did wisher say this?**
- wish says "handle cleanup on role unlink" as acceptance criteria
- didn't specify HOW — assumes extant machinery

**verification needed?**
- yes — inspect syncHooksForLinkedRoles to confirm it iterates role.hooks.onBrain dynamically

**verdict:** assumption is reasonable but needs code verification at implementation time

---

## assumption 2: UserPromptSubmit receives prompt via stdin

**what do we assume?**
- hook command receives the user's prompt text via stdin
- same pattern as other claude code hooks

**what evidence supports this?**
- vision lists this as assumption, flagged for external research
- claude code docs should confirm this

**what if the opposite were true?**
- if prompt not passed via stdin, hook command can't read it
- "accumulate asks" usecase would fail

**did wisher say this?**
- wisher didn't specify stdin behavior
- inferred from claude code's general hook pattern

**verification needed?**
- yes — flagged in vision's "external research needed"

**verdict:** high-risk assumption, must verify before implementation

---

## assumption 3: timeout semantics are identical to other hooks

**what do we assume?**
- IsoDuration timeout works the same for UserPromptSubmit as for SessionStart
- claude code treats all hooks uniformly

**what evidence supports this?**
- research doc shows all hooks have same structure in settings.json
- translateHook.ts applies timeout uniformly via toMilliseconds

**what if the opposite were true?**
- if UserPromptSubmit has different timeout behavior, hooks might fail silently
- unlikely — claude code appears to treat all hooks uniformly

**did wisher say this?**
- wisher didn't specify timeout behavior
- inferred from extant hook implementation

**verdict:** low-risk assumption, likely correct based on claude code's uniform hook structure

---

## assumption 4: matcher defaults to `*` for UserPromptSubmit

**what do we assume?**
- `*` wildcard matcher applies to UserPromptSubmit
- no subject-based filter needed (unlike PreToolUse which filters by tool name)

**what evidence supports this?**
- translateHook.ts uses `*` for onBoot (SessionStart) hooks
- UserPromptSubmit is similar — no subject to match against

**what if the opposite were true?**
- if UserPromptSubmit requires specific matcher, hooks might not fire
- need to check claude code docs for matcher requirements

**did wisher say this?**
- wisher didn't specify matcher semantics
- inferred from SessionStart parallel

**verdict:** medium-risk assumption, should verify in claude code docs

---

## assumption 5: only one UserPromptSubmit event (no sub-events)

**what do we assume?**
- UserPromptSubmit is a single event, not a family of events
- no need for filter.what like onBoot has for PreCompact/PostCompact

**what evidence supports this?**
- research doc lists events separately: SessionStart, PreCompact, PostCompact, UserPromptSubmit
- suggests UserPromptSubmit is atomic

**what if the opposite were true?**
- if UserPromptSubmit has variants, we'd need filter.what support
- can extend later — not a concern that blocks us

**did wisher say this?**
- wisher didn't specify filter support
- inferred from research doc

**verdict:** low-risk assumption, extensible if wrong

---

## assumption 6: UserPromptSubmit fires BEFORE brain processes prompt

**what do we assume?**
- hook fires before the LLM receives the prompt
- enables "intercept and modify" usecases

**what evidence supports this?**
- "Submit" suggests the action of submission, before the brain acts
- but not verified

**what if the opposite were true?**
- "intent detection before brain acts" usecase breaks
- but "accumulate asks" (wisher's usecase) still works

**did wisher say this?**
- wisher's usecase is "accumulate asks" — works regardless
- "before brain acts" inferred, not stated

**verdict:** medium-risk assumption, but wisher's usecase is safe either way

---

## assumption 7: non-zero exit code blocks prompt submission

**what do we assume?**
- if hook command returns non-zero, prompt is blocked
- same as PreToolUse behavior

**what evidence supports this?**
- vision lists this as assumption, flagged for external research
- PreToolUse has this behavior

**what if the opposite were true?**
- "block malicious prompts" usecase wouldn't work
- but wisher's usecase (accumulate asks) doesn't need to block

**did wisher say this?**
- wisher didn't mention the block behavior
- inferred from PreToolUse parallel

**verdict:** medium-risk assumption, but not critical to wisher's usecase

---

## summary

| assumption | risk | critical to usecase? | action |
|------------|------|----------------------|--------|
| sync machinery handles onTalk | medium | yes | verify at implementation |
| stdin receives prompt | high | yes | external research |
| timeout semantics uniform | low | no | likely correct |
| matcher defaults to `*` | medium | yes | verify in docs |
| single event (no sub-events) | low | no | extensible |
| fires before brain acts | medium | no | wisher's usecase works either way |
| non-zero blocks prompt | medium | no | not needed for usecase |

high-risk assumption (stdin receives prompt) is flagged in vision for external research before implementation.

all assumptions are documented and actionable.
