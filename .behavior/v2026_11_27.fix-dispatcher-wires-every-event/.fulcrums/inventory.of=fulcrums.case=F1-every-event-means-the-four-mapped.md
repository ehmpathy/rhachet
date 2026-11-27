# F1 — "every claude event" = the four a manifest row can name

## .the fork
- a: wire the four events `CLAUDE_EVENT_OF_BRAIN_HOOK_EVENT` maps (SessionStart, PreToolUse, UserPromptSubmit, Stop)
- b: wire every event claude documents (SubagentStop, PostToolUse, PermissionRequest, PreCompact, …)

## .taken = a, why
no row can name any other event: `asClaudeEventOfBrainHookEvent` throws for an unmapped one, and the manifest is rederived from roles at each sync. a wire on an event no row can reach costs a process per occurrence (PostToolUse: one per tool call) for no possible rule. the wish's SubagentStop example needs a new `BrainHookEvent` first.

## .rework = clean, why
derive the event list from one constant; option b is a one-line widen of that list.

## .confidence = 90%, why lower
the wish names SubagentStop by example; the wisher may expect it. flagged in the vision's open questions.

## .the dispute raised against it
the experience-coverage reviewer (i001 r002, blocker.1) holds the SubagentStop check as a critipath
the wish implies, with no case to demo it. the reviewer grants the reason is sound and asks for the
wisher's sign-off. no change this work is permitted to make can demo it: no `BrainHookEvent` maps to
SubagentStop, so no role can author the row, no sync can write it, and a wire on it would serve no
possible rule. to make it possible needs a new rhachet hook event across the role contract and each
brain adapter — a larger wish than "wire the events we have whole". verdict owed by the wisher.

## .where
`src/domain.operations/brains/dispatch/asHookDispatchersOfRules.ts`, `constants.ts`
