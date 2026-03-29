# self-review r6: has-behavior-declaration-coverage

## vision requirements coverage

### requirement 1: hook fires only on compaction

**vision says:**
> "vlad's role has a `trust-but-verify` hook that only fires after compaction"

**blueprint addresses:** yes
- codepath tree line 31-37: onBoot + filter.what=PostCompact → PostCompact event only
- test coverage line 94: "onBoot filter.what=PostCompact" case

**verdict: COVERED**

---

### requirement 2: distinguish compaction from session start

**vision says:**
> "can target compaction specifically" vs "hooks fire on all boots or none"

**blueprint addresses:** yes
- codepath tree line 31-37: filter.what determines which event fires
- SessionStart = broad (new session + compaction)
- PostCompact = narrow (compaction only)

**verdict: COVERED**

---

### requirement 3: backwards compatible

**vision says:**
> "no filter = SessionStart only (same as prior)"

**blueprint addresses:** yes
- codepath tree line 33: "no filter → SessionStart (backwards compat)"
- test coverage line 90: "onBoot no filter" case

**verdict: COVERED**

---

### requirement 4: pre-compaction support

**vision says:**
> usecase 3: "pre-compaction state save" with filter.what=PreCompact

**blueprint addresses:** yes
- codepath tree line 35: "filter.what = valid boot event → that event"
- test coverage line 96: "onBoot filter.what=PreCompact" case

**verdict: COVERED**

---

### requirement 5: wildcard support

**vision says:**
> filter.what=* for "all boot triggers"

**blueprint addresses:** yes
- codepath tree line 36: "filter.what = '*' → return array of all boot events"
- test coverage line 100: "onBoot filter.what=*" case

**verdict: COVERED**

---

### requirement 6: supplier brief

**vision says:**
> "findsert a brain supplier brief on how to register briefs"

**blueprint addresses:** yes
- filediff tree: `[+] howto.use.brain.hooks.md`
- supplier brief outline section with .what/.why/.how structure

**verdict: COVERED**

---

### requirement 7: readme link

**vision says:**
> "ensure that brief is linked like the other brain supplier briefs"

**blueprint addresses:** yes
- readme update section: "add to brains section (after line 516)"
- table row format matches extant pattern

**verdict: COVERED**

---

## criteria coverage

### usecase.1 = hook fires only on PostCompact

**criteria:**
```
given(role declares onBoot hook with filter.what=PostCompact)
  when(role hooks are synced)
    then(hook is registered under PostCompact event)
    then(hook does NOT fire on fresh session start)
```

**blueprint addresses:**
- codepath: filter.what=PostCompact → PostCompact event
- test: "onBoot filter.what=PostCompact" → `[{ event: 'PostCompact', ... }]`

**verdict: COVERED**

---

### usecase.2 = hook fires only on PreCompact

**criteria:**
```
given(role declares onBoot hook with filter.what=PreCompact)
  when(role hooks are synced)
    then(hook is registered under PreCompact event)
```

**blueprint addresses:**
- codepath: filter.what=PreCompact → PreCompact event
- test: "onBoot filter.what=PreCompact" → `[{ event: 'PreCompact', ... }]`

**verdict: COVERED**

---

### usecase.3 = backwards compat: no filter = SessionStart only

**criteria:**
```
given(role declares onBoot hook without filter)
  when(role hooks are synced)
    then(hook is registered under SessionStart event)
    then(hook does NOT fire on PreCompact)
    then(hook does NOT fire on PostCompact)
```

**blueprint addresses:**
- codepath line 33: "no filter → SessionStart (backwards compat)"
- test: "onBoot no filter" → `[{ event: 'SessionStart', ... }]`
- single event return (not array of 3)

**verdict: COVERED**

---

### usecase.4 = explicit SessionStart filter

**criteria:**
```
given(role declares onBoot hook with filter.what=SessionStart)
  when(role hooks are synced)
    then(hook is registered under SessionStart event)
```

**blueprint addresses:**
- codepath: filter.what=SessionStart → SessionStart event
- test: "onBoot filter.what=SessionStart" → `[{ event: 'SessionStart', ... }]`

**verdict: COVERED**

---

### usecase.5 = wildcard filter fires on all boot events

**criteria:**
```
given(role declares onBoot hook with filter.what=*)
  when(role hooks are synced)
    then(hook is registered under SessionStart event)
    then(hook is registered under PreCompact event)
    then(hook is registered under PostCompact event)
```

**blueprint addresses:**
- codepath line 36: "filter.what = '*' → return array of all boot events"
- test: "onBoot filter.what=*" → `[{ event: 'SessionStart' }, { event: 'PreCompact' }, { event: 'PostCompact' }]`

**verdict: COVERED**

---

### usecase.6 = invalid filter value fails fast

**criteria:**
```
given(role declares onBoot hook with filter.what=InvalidValue)
  when(role hooks are synced)
    then(sync fails with clear error)
```

**blueprint addresses:**
- codepath line 37: "filter.what = invalid → throw UnexpectedCodePathError"
- test: "onBoot filter.what=Invalid" → throws UnexpectedCodePathError

**verdict: COVERED**

---

## deliverables check

| deliverable | vision | blueprint |
|-------------|--------|-----------|
| adapter update | "extend translateHook" | filediff translateHook.ts [~] |
| tests | implied by criteria | translateHook.test.ts [~] |
| genBrainHooksAdapterForClaudeCode | del fix from r1 | filediff [~] |
| supplier brief | explicit in wish | filediff howto.use.brain.hooks.md [+] |
| readme link | explicit in wish | readme.md [~] |

**verdict: ALL DELIVERABLES PRESENT**

---

## lessons

### lesson 1: trace every requirement

each requirement from vision/criteria must appear in the blueprint:
- codepath tree for logic changes
- test coverage for verification
- filediff for file changes

if a requirement has no matched blueprint element, it's a gap.

### lesson 2: criteria are the checklist

the criteria usecases (1-6) are the definitive list of behaviors. the blueprint test coverage table should have at least one row per usecase.

### lesson 3: deliverables come from vision

the vision's "deliverables" section lists explicit outputs. every item there must appear in the filediff tree.

---

## final verdict

| requirement type | covered |
|------------------|---------|
| vision day-in-the-life | yes |
| vision usecases 1-3 | yes |
| vision deliverables | yes |
| criteria usecases 1-6 | yes |

**verdict: COMPLETE COVERAGE** — all vision requirements and criteria usecases are addressed in the blueprint.
