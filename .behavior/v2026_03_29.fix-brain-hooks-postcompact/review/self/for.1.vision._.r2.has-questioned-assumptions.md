# self-review: has-questioned-assumptions

## assumption 1: claude code exposes PreCompact and PostCompact hooks

**what do we assume?** that claude code already has these hook events available

**evidence:** the wish implies these exist; we need to verify with claude code documentation

**what if opposite?** if these hooks don't exist, the entire vision is moot. we'd need to request this feature from anthropic first.

**verdict: ASSUMPTION TO VALIDATE** — must verify these hooks exist in claude code before we proceed

---

## assumption 2: SessionStart fires on both fresh session and compaction

**what do we assume?** that SessionStart is the broad event that fires in both cases

**evidence:** user confirmed this in review: "SessionStart already covers compaction"

**what if opposite?** if SessionStart only fired on fresh sessions, then PostCompact would be the only compaction hook, not a subset

**verdict: HOLDS** — user explicitly confirmed this behavior. this is established fact, not assumption.

---

## assumption 3: PostCompact fires ONLY on compaction, not fresh session

**what do we assume?** that PostCompact is the narrow event that fires only when compaction occurs

**evidence:** this is the semantics implied by the name "Post-Compact"

**what if opposite?** if PostCompact also fired on fresh session, it would be identical to SessionStart and useless for our goal

**verdict: ASSUMPTION TO VALIDATE** — need to verify with claude code documentation

---

## assumption 4: no filter = SessionStart only is backwards compatible

**what do we assume?** that prior onBoot hooks without filter currently map to SessionStart

**evidence:** translateHook.ts shows:
```ts
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  ...
};
```

**what if opposite?** if prior behavior was different, this would be a compat break

**verdict: HOLDS** — code evidence supports this. prior behavior maps onBoot → SessionStart only.

---

## assumption 5: filter.what pattern works for boot events like it does for tools

**what do we assume?** that reuse of filter.what for boot trigger selection is the right abstraction

**evidence:** onTool already uses filter.what to select which tools trigger the hook

**what if opposite?** could use separate events (onPreCompact, onPostCompact) instead of filters

**verdict: DESIGN CHOICE** — this is a conscious design decision, not an assumption. we chose filter.what because:
1. avoids event proliferation (one onBoot umbrella vs three events)
2. consistent mental model with onTool
3. extensible for future boot events

---

## assumption 6: claude code hook schema for PreCompact/PostCompact is similar to SessionStart

**what do we assume?** that these hooks have the same structure as SessionStart (array of hook entries)

**evidence:** SessionStart and Stop use this structure; likely the same for new events

**what if opposite?** if PreCompact/PostCompact have a different schema (e.g., with matcher like PreToolUse), the translation logic would differ

**verdict: ASSUMPTION TO VALIDATE** — need to research claude code's actual schema for these hooks

---

## assumptions to validate in research phase

1. PreCompact and PostCompact hooks exist in claude code
2. PostCompact fires only on compaction, not fresh session
3. schema for PreCompact/PostCompact hooks matches SessionStart pattern

---

## lessons

### lesson 1: distinguish fact from assumption

user feedback in review turned "SessionStart fires on compaction" from assumption into fact. other claims (PreCompact/PostCompact exist) remain assumptions until validated.

### lesson 2: flag assumptions that would invalidate the vision

if PreCompact/PostCompact don't exist in claude code, the entire vision is blocked. this is a critical path assumption that must be validated early in research phase.

