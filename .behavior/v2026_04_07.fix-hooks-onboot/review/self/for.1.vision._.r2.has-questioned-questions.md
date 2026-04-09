# self-review: has-questioned-questions

## triage of open questions

### assumption 1: UserPromptSubmit behavior (stdin + when it fires)

**can this be answered via logic now?** no — this is claude code behavior, not rhachet

**can this be answered via extant docs or code?** partially — research doc mentions event exists but doesn't confirm stdin behavior or event sequence

**should this be answered via external research?** yes

**verdict:** [research] — confirm via claude code docs or test

---

### assumption 2: timeout semantics

**can this be answered via logic now?** yes

**why it holds:**
- `translateHook.ts` applies `toMilliseconds(hook.timeout)` uniformly to ALL events
- no event-specific timeout handler exists
- claude code treats hooks uniformly (same structure in settings.json)

**verdict:** [answered] — timeout semantics are uniform across all events

---

### assumption 3: matcher semantics

**can this be answered via logic now?** partially

**why it likely holds:**
- for `onBoot`, translateHook uses `*` when no filter.what specified
- for `onTool` and `onStop`, translateHook uses `filter?.what ?? '*'`
- `onTalk` would follow same pattern: `*` wildcard if no filter

**what remains uncertain:**
- does claude code require specific matcher for UserPromptSubmit?
- likely `*` works since no subject to match, but should confirm

**verdict:** [research] — default `*` is likely correct, confirm via test

---

### question 1: filter support

**can this be answered via logic now?** no

**why not:**
- `onBoot` uses filter.what to distinguish SessionStart/PreCompact/PostCompact
- if `UserPromptSubmit` has sub-events, filter would be needed
- research doc lists it as single event, but only wisher knows if filter is desired

**verdict:** [wisher] — requires scope decision

---

### question 2: PostUserPromptSubmit

**can this be answered via logic now?** partially

**what we can research:** does claude code have a `PostUserPromptSubmit` event?

**what only wisher knows:** if it exists, should we add `onTalkAfter` now or defer?

**verdict:** [research] for existence, [wisher] for scope decision

---

### question 3: opencode scope

**can this be answered via logic now?** no

**why not:**
- this is a scope decision for the wisher
- if opencode lacks equivalent event, onTalk is claude-only
- if opencode has equivalent, work to implement is larger

**verdict:** [wisher] — requires scope decision

---

### research item 1: stdin receives prompt

**verdict:** [research]

---

### research item 2: non-zero exit blocks prompt

**verdict:** [research]

---

### research item 3: PostUserPromptSubmit exists

**verdict:** [research]

---

## summary

| question | triage | rationale |
|----------|--------|-----------|
| UserPromptSubmit stdin + when fires | [research] | claude code behavior |
| timeout semantics | [answered] | verified via translateHook.ts |
| matcher semantics | [research] | likely `*`, confirm via test |
| filter support | [wisher] | scope decision |
| PostUserPromptSubmit existence | [research] | claude code behavior |
| PostUserPromptSubmit scope | [wisher] | scope decision |
| opencode scope | [wisher] | scope decision |
| stdin receives prompt | [research] | claude code behavior |
| non-zero blocks prompt | [research] | claude code behavior |

**counts:**
- [answered]: 1
- [research]: 6
- [wisher]: 3

---

## vision update completed

updated the vision's "open questions & assumptions" section to mark each item with its triage status:

**before:**
- questions listed without triage markers

**after:**
- assumptions marked [research] or [answered]
- wisher questions marked [wisher]
- research items marked [research]

this enables the behaver to know which phase addresses each question:
- [answered]: resolved, no further work
- [research]: address in research phase
- [wisher]: ask wisher before implementation
