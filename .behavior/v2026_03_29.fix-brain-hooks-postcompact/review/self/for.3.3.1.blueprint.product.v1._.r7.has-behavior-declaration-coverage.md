# self-review r7: has-behavior-declaration-coverage

## method

1. extract requirements from vision
2. extract usecases from criteria
3. trace each to blueprint lines
4. verify no items omitted

---

## vision → blueprint traceability

### vision requirement 1: compaction-specific hooks

**source:** vision day-in-the-life
> "vlad's role has a `trust-but-verify` hook that only fires after compaction. when context compacts, the hook questions the assumptions"

**blueprint trace:**
- codepath tree line 35: filter.what = PostCompact → that event
- test coverage row: "onBoot filter.what=PostCompact" → `[{ event: 'PostCompact' }]`
- supplier brief outline: filter.what=PostCompact example

**why it holds:** the blueprint explicitly handles PostCompact as a valid filter.what value that routes to the PostCompact claude code event.

---

### vision requirement 2: SessionStart includes compaction

**source:** vision mental model
> "claude code fires SessionStart on both: new session start, after compaction"

**blueprint trace:**
- codepath tree line 33: no filter → SessionStart (backwards compat)
- this means hooks without filter fire on new session AND compaction
- PostCompact hooks fire ONLY on compaction (subset)

**why it holds:** the blueprint preserves SessionStart semantics (broad) while it adds PostCompact (narrow).

---

### vision requirement 3: backwards compatibility

**source:** vision terms table
> "onBoot + no filter → SessionStart (backwards compat: same as prior behavior)"

**blueprint trace:**
- codepath tree line 33: explicit "backwards compat" note
- test coverage row 1: "onBoot no filter" → SessionStart only
- criteria usecase.3 explicitly requires this

**why it holds:** the blueprint defaults to SessionStart when no filter is provided, which matches prior behavior exactly.

---

### vision requirement 4: PreCompact support

**source:** vision usecase 3
> "pre-compaction state save... filter.what=PreCompact"

**blueprint trace:**
- codepath tree line 35: valid boot event → that event
- test coverage row: "onBoot filter.what=PreCompact" → PreCompact
- supplier brief outline: PreCompact in filter.what values table

**why it holds:** PreCompact is treated identically to PostCompact — just another valid boot trigger.

---

### vision requirement 5: wildcard support

**source:** vision terms table
> "onBoot + filter.what=* → all three events"

**blueprint trace:**
- codepath tree line 36: filter.what='*' → return array of all boot events
- test coverage row: wildcard → 3 events
- criteria usecase.5 explicitly requires all three

**why it holds:** wildcard is the only case that returns multiple entries. the blueprint explicitly enumerates all three boot events.

---

### vision requirement 6: supplier brief

**source:** wish (in vision citations)
> "findsert a brain supplier brief on how to register briefs"

**blueprint trace:**
- filediff tree: `[+] howto.use.brain.hooks.md`
- supplier brief outline section: complete structure with .what/.why/.how

**why it holds:** the brief is explicitly listed as a new file with full outline.

---

### vision requirement 7: readme link

**source:** wish (in vision citations)
> "ensure that brief is linked like the other brain supplier briefs"

**blueprint trace:**
- readme update section: "add to brains section (after line 516)"
- format: table row that matches extant pattern

**why it holds:** the blueprint shows the exact line to insert and the format to use.

---

## criteria → blueprint traceability

### usecase.1 = PostCompact only

**criteria:**
```
given(role declares onBoot hook with filter.what=PostCompact)
  then(hook is registered under PostCompact event)
  then(hook does NOT fire on fresh session start)
```

**blueprint:**
- test row: filter.what=PostCompact → PostCompact event only
- returns single-element array, not SessionStart

**verdict: COVERED**

---

### usecase.2 = PreCompact only

**criteria:**
```
given(role declares onBoot hook with filter.what=PreCompact)
  then(hook is registered under PreCompact event)
```

**blueprint:**
- test row: filter.what=PreCompact → PreCompact event only

**verdict: COVERED**

---

### usecase.3 = no filter = SessionStart only

**criteria:**
```
given(role declares onBoot hook without filter)
  then(hook is registered under SessionStart event)
  then(hook does NOT fire on PreCompact)
  then(hook does NOT fire on PostCompact)
```

**blueprint:**
- test row: no filter → SessionStart only
- codepath notes "backwards compat"
- single event, not array of 3

**verdict: COVERED**

---

### usecase.4 = explicit SessionStart

**criteria:**
```
given(role declares onBoot hook with filter.what=SessionStart)
  then(hook is registered under SessionStart event)
```

**blueprint:**
- test row: filter.what=SessionStart → SessionStart
- same behavior as no filter, but explicit

**verdict: COVERED**

---

### usecase.5 = wildcard = all events

**criteria:**
```
given(role declares onBoot hook with filter.what=*)
  then(hook is registered under SessionStart event)
  then(hook is registered under PreCompact event)
  then(hook is registered under PostCompact event)
```

**blueprint:**
- test row: wildcard → array of 3 events
- codepath returns `[SessionStart, PreCompact, PostCompact]`

**verdict: COVERED**

---

### usecase.6 = invalid filter fails fast

**criteria:**
```
given(role declares onBoot hook with filter.what=InvalidValue)
  then(sync fails with clear error)
```

**blueprint:**
- test row: Invalid → throws UnexpectedCodePathError
- codepath line 37: explicit error throw

**verdict: COVERED**

---

## gap analysis

| source | total requirements | covered | gaps |
|--------|-------------------|---------|------|
| vision day-in-the-life | 1 | 1 | 0 |
| vision mental model | 2 | 2 | 0 |
| vision usecases | 3 | 3 | 0 |
| vision deliverables | 2 | 2 | 0 |
| criteria usecases | 6 | 6 | 0 |

**total gaps: 0**

---

## lessons

### lesson 1: bidirectional trace

trace vision → blueprint AND blueprint → vision. gaps show up in both directions:
- vision → blueprint: did we address this?
- blueprint → vision: where did this come from?

### lesson 2: criteria are exhaustive

the criteria usecases form a complete test matrix. if the blueprint test coverage table covers all 6 usecases, the implementation is complete.

### lesson 3: wish items are deliverables

the wish explicitly listed: supplier brief + readme link. these are mandatory deliverables, not optional enhancements.

---

## final verdict

**verdict: COMPLETE COVERAGE**

all vision requirements traced to blueprint. all criteria usecases addressed. no gaps found.
