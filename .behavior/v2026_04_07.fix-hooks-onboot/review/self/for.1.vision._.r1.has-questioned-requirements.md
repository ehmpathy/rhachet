# self-review: has-questioned-requirements

## requirement 1: add `onTalk` hook type

**who said this?** the wish document, authored by human who delegated to mechanic.

**what evidence supports it?**
- achiever role needs to track user asks as they arrive
- claude code has `UserPromptSubmit` event that fires on prompt submission
- rhachet currently lacks a hook type that maps to this event

**what if we didn't do this?**
- achiever role continues via init workaround (jq injection into settings.json)
- workaround is fragile: manual init required, no cleanup on unlink, invisible to rhachet tools
- other roles that need this behavior must duplicate the workaround

**is scope too large, too small, or misdirected?**
- scope is appropriate: add one hook type, map to one claude event
- not attempting to add all absent events (SubagentStop, PostToolUse, etc.)
- focused on the immediate need

**simpler way?**
- could document the workaround and call it "supported pattern" — but this fights the abstraction
- could add a generic "customHooks" escape hatch — but loses type safety and observability
- no, the direct approach (add onTalk) is the simplest solution

**verdict: holds** ✓

---

## requirement 2: name it `onTalk`

**who said this?** the wish document.

**what evidence supports it?**
- "talk" implies human communication — matches prompt submission
- short (6 chars vs 12+ for alternatives)
- fits seaturtle vibe ("let's talk")

**what if we used a different name?**

| alternative | concern |
|-------------|---------|
| `onPrompt` | could confuse with system prompt |
| `onAsk` | rhachet already uses "ask" for a different concept |
| `onMessage` | verbose |
| `onUserPrompt` | verbose |
| `onSubmit` | too generic |

**verdict: holds** ✓

the vision documents alternatives and recommends `onTalk`. name is justified.

---

## requirement 3: map to `UserPromptSubmit`

**who said this?** the wish document.

**what evidence supports it?**
- claude code documentation lists `UserPromptSubmit` as the event for prompt submission
- research doc (.behavior/v2026_01_09.hook-adapter/3.1.research.access._.v1.i1.md) confirms the event name

**what if we mapped to a different event?**
- no other event fires on prompt submission
- this is the only correct map

**verdict: holds** ✓

---

## requirement 4: auto-sync on link

**who said this?** implicit from extant architecture.

**what evidence supports it?**
- all other hooks (onBoot, onTool, onStop) auto-sync on `roles link`
- if onTalk didn't auto-sync, it would be inconsistent

**what if we didn't do this?**
- developers would need manual step to sync onTalk hooks
- breaks the mental model that "roles link syncs all"

**verdict: holds** ✓ — follows from extant design

---

## requirement 5: auto-cleanup on unlink

**who said this?** implicit from extant architecture + wish mentions "role unlink removes the hook"

**what evidence supports it?**
- all other hooks clean up on unlink
- wish acceptance criteria includes this

**what if we didn't do this?**
- orphaned hooks accumulate (exact problem wish describes with workaround)
- breaks expectation that "unlink is inverse of link"

**verdict: holds** ✓

---

## assumption: UserPromptSubmit fires BEFORE brain processes

**is this verified?**
- vision lists this as assumption, not verified fact
- research doc mentions the event but doesn't confirm the sequence

**risk if wrong:**
- if it fires AFTER, the "intent detection before brain processes" usecase breaks
- but "accumulate asks" usecase still works

**action:** flagged in vision's "external research needed" section. acceptable risk — the primary usecase (accumulate asks) works regardless of when it fires.

---

## assumption: no filter support needed for onTalk

**is this verified?**
- vision notes that onBoot uses `filter.what` for PreCompact/PostCompact
- vision assumes onTalk doesn't need this because there's only one event

**risk if wrong:**
- if UserPromptSubmit has sub-events, we'd need to add filter support later
- but this is easily extensible — add filter.what later if needed

**verdict: acceptable** — start simple, extend if needed

---

## summary

| requirement | verdict |
|-------------|---------|
| add onTalk hook type | holds ✓ |
| name it onTalk | holds ✓ |
| map to UserPromptSubmit | holds ✓ |
| auto-sync on link | holds ✓ |
| auto-cleanup on unlink | holds ✓ |

all requirements justified. vision is ready for external review.
