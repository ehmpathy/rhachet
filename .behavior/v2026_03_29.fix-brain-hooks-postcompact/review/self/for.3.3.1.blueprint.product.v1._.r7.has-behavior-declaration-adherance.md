# self-review r7: has-behavior-declaration-adherance

## method

this review checks: does the blueprint correctly interpret the vision/criteria?

previous review (r6/r7 coverage) checked: does the blueprint address each requirement?

this review asks: does the blueprint address each requirement **correctly**?

---

## adherance check: vision

### vision says: "hook fires only on compaction"

**blueprint says:** filter.what=PostCompact → PostCompact event

**adherance check:** the vision describes a hook that fires "only" on compaction. the blueprint routes to PostCompact claude code event, which (per claude code docs) fires only after compaction.

**verdict: ADHERES**

---

### vision says: "SessionStart fires on both new session AND compaction"

**blueprint says:** no filter → SessionStart (backwards compat)

**adherance check:** the vision mental model states SessionStart is broad (fires on new session + compaction). the blueprint preserves this by default. hooks without filter continue to fire on both cases.

**verdict: ADHERES**

---

### vision says: "PostCompact is a subset of SessionStart triggers"

**blueprint says:** PostCompact → PostCompact only; SessionStart → SessionStart

**adherance check:** the vision establishes that PostCompact is narrower than SessionStart. the blueprint correctly treats them as distinct events — PostCompact hooks do not fire on SessionStart, and SessionStart hooks do not fire only on compaction.

**verdict: ADHERES**

---

### vision says: "backwards compat: no filter = SessionStart only"

**blueprint says:** codepath line 33: "no filter → SessionStart (backwards compat)"

**adherance check:** the vision explicitly requires that hooks without filter continue to work as before. the blueprint defaults to SessionStart when filter is absent. prior roles with onBoot hooks will see no behavior change.

**verdict: ADHERES**

---

### vision says: "wildcard fires on all boot triggers"

**blueprint says:** filter.what=* → array of [SessionStart, PreCompact, PostCompact]

**adherance check:** the vision shows wildcard as "all boot events". the blueprint returns all three. the order matches logical execution order (SessionStart could fire on new session, PreCompact before compact, PostCompact after).

**verdict: ADHERES**

---

### vision says: "filter.what for onBoot selects boot trigger (not matcher)"

**blueprint says:** for onBoot, filter.what determines event; matcher is always '*'

**adherance check:** the vision semantic model states filter.what has different interpretation per event type:
- onTool: filter.what = matcher (tool name)
- onBoot: filter.what = event selector (boot trigger)

the blueprint correctly sets matcher='*' for boot events because there is no subject to match.

**verdict: ADHERES**

---

## adherance check: criteria

### usecase.1: PostCompact only

**criteria says:** hook with filter.what=PostCompact fires only on PostCompact event

**blueprint says:** returns single `{ event: 'PostCompact' }` entry

**adherance check:** the test expectation shows single PostCompact entry, not SessionStart. the hook will fire only on compaction.

**verdict: ADHERES**

---

### usecase.2: PreCompact only

**criteria says:** hook with filter.what=PreCompact fires only on PreCompact event

**blueprint says:** returns single `{ event: 'PreCompact' }` entry

**adherance check:** parallel to usecase.1. PreCompact is treated the same way.

**verdict: ADHERES**

---

### usecase.3: no filter = SessionStart only

**criteria says:**
```
then(hook does NOT fire on PreCompact)
then(hook does NOT fire on PostCompact)
```

**blueprint says:** returns single `{ event: 'SessionStart' }` entry

**adherance check:** the test shows single SessionStart entry. the hook will not fire on PreCompact or PostCompact because it's only registered under SessionStart bucket.

**verdict: ADHERES**

---

### usecase.4: explicit SessionStart

**criteria says:** filter.what=SessionStart behaves same as no filter

**blueprint says:** returns `{ event: 'SessionStart' }`

**adherance check:** explicit SessionStart produces same result as no filter. this is redundant but valid — allows role authors to be explicit.

**verdict: ADHERES**

---

### usecase.5: wildcard

**criteria says:** all three events must be registered

**blueprint says:** returns array with all three events

**adherance check:** the test expectation shows array with SessionStart, PreCompact, PostCompact. all three are covered.

**verdict: ADHERES**

---

### usecase.6: invalid value fails fast

**criteria says:** sync fails with clear error

**blueprint says:** throws UnexpectedCodePathError

**adherance check:** the error type is appropriate for invalid configuration. the error will include context about what value was invalid.

**verdict: ADHERES**

---

## potential misinterpretations checked

### Q: does "PostCompact" mean "after compaction completes" or "at time of compaction"?

**vision says:** "fires only when compaction just happened"

**blueprint says:** PostCompact = after compaction

**check:** the name "Post" means "after", which matches vision intent. no misinterpretation.

---

### Q: should wildcard include future boot events?

**vision says:** wildcard means "all boot triggers"

**blueprint says:** hardcoded array of 3 events

**check:** the blueprint uses inline array. if claude code adds new boot events later, the array would need update. this is acceptable — the blueprint addresses current claude code capabilities.

---

### Q: should invalid filter throw or return empty?

**criteria says:** "sync fails with clear error"

**blueprint says:** throws UnexpectedCodePathError

**check:** "fails" means throw, not return empty. the blueprint is correct.

---

## lessons

### lesson 1: adherance vs coverage

coverage asks: is it mentioned?
adherance asks: is it correct?

a blueprint can mention all requirements but misinterpret them. this review catches misinterpretations.

### lesson 2: semantic precision

the vision uses precise terms:
- "only" = exclusive
- "subset" = narrower scope
- "backwards compat" = no changes to prior behavior

the blueprint must match these semantics, not just mention them.

### lesson 3: error types carry interpretation

UnexpectedCodePathError means "this should not happen". BadRequestError means "your input is invalid". the blueprint chose correctly — invalid filter.what is a configuration error, not user input.

---

## final verdict

| aspect | adherance |
|--------|-----------|
| vision semantics | correct |
| criteria behavior | correct |
| error handle | correct |
| edge cases | addressed |

**verdict: ADHERES** — the blueprint correctly interprets all vision and criteria requirements. no misinterpretations found.
