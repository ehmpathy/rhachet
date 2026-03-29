# self-review r8: has-behavior-declaration-adherance

## what adherance means

adherance is not coverage. coverage asks "did we mention it?" adherance asks "did we interpret it correctly?"

this review walks through the blueprint and verifies each choice matches the vision/criteria intent.

---

## blueprint line-by-line adherance

### filediff tree: translateHook.ts [~]

**vision intent:** extend translator to support filter.what for onBoot

**blueprint says:** modify extant file, not new file

**adherance:** correct. the vision says "extend translateHook" — a modification to the extant file is the right approach.

---

### codepath tree line 33: no filter → SessionStart

**vision intent:** backwards compat means no behavior change for extant roles

**blueprint says:** no filter defaults to SessionStart

**adherance:** correct. extant roles with onBoot hooks have no filter. they will continue to register under SessionStart. no behavior change.

---

### codepath tree line 35: filter.what = valid boot event → that event

**vision intent:** filter.what selects which boot trigger fires the hook

**blueprint says:** route to the specified event

**adherance:** correct. the vision's mental model shows filter.what as event selector for onBoot.

---

### codepath tree line 36: filter.what = '*' → return array of all boot events

**vision intent:** wildcard means "all boot triggers"

**blueprint says:** return array with SessionStart, PreCompact, PostCompact

**adherance:** correct. the vision explicitly lists these three as the boot triggers. the blueprint returns all three.

**deeper check:** is the order correct?

- SessionStart: fires on new session and on compaction restart
- PreCompact: fires before compaction
- PostCompact: fires after compaction

the blueprint uses `[SessionStart, PreCompact, PostCompact]`. this is logical order for a session that experiences compaction. adherance holds.

---

### codepath tree line 37: invalid → throw UnexpectedCodePathError

**vision intent:** "sync fails with clear error" (from criteria)

**blueprint says:** throw UnexpectedCodePathError with context

**adherance:** correct. r2 reviewed the error type choice. UnexpectedCodePathError is appropriate for configuration errors.

---

### test coverage table rows

**vision intent:** each criteria usecase must have a test

**blueprint test table:**
- row 1: onBoot no filter → usecase.3
- row 2: onBoot PostCompact → usecase.1
- row 3: onBoot PreCompact → usecase.2
- row 4: onBoot SessionStart → usecase.4
- row 5: onBoot wildcard → usecase.5
- row 6: onBoot Invalid → usecase.6

**adherance:** all 6 usecases covered. each test verifies the correct expectation.

---

### reverse translation table

**vision intent:** bidirectional translation for round-trip integrity

**blueprint says:**
- PostCompact → onBoot + filter.what=PostCompact
- PreCompact → onBoot + filter.what=PreCompact
- SessionStart → onBoot (no filter)

**adherance:** correct. the vision notes that SessionStart without filter is backwards compat. the reverse translation correctly omits filter for SessionStart.

**deeper check:** why no filter for SessionStart?

because the vision says "no filter = SessionStart" is the backwards compat case. if we read a SessionStart hook and add filter.what=SessionStart, we'd be inserted information that wasn't there before. the reverse translation preserves the original form.

---

### genBrainHooksAdapterForClaudeCode.del update

**vision intent:** not in original vision, but r1 review discovered this bug

**blueprint says:** del must check filter.what to find correct bucket

**adherance:** correct. this is a bug fix discovered in review, not a new feature. the blueprint addresses it because extant code would fail to delete PostCompact hooks.

---

### ClaudeCodeSettings type extension

**vision intent:** adapter must write to PreCompact/PostCompact buckets

**blueprint says:** add PreCompact and PostCompact to interface

**adherance:** correct. the type must know about the new buckets for type safety.

---

### supplier brief outline

**vision intent:** document how to use PostCompact hooks

**blueprint outline:**
- .what: run hooks only when context compacts
- .why: PostCompact fires only on compaction
- .how: yaml example with filter.what=PostCompact
- table of filter.what values

**adherance:** correct. the outline covers what users need to know.

**deeper check:** does the example match vision usecase 1?

vision usecase 1:
```yaml
filter:
  what: PostCompact
```

blueprint outline example:
```yaml
filter:
  what: PostCompact
```

match confirmed.

---

### readme update

**vision intent:** link brief "like the other brain supplier briefs"

**blueprint says:** add table row to brains section

**adherance:** correct. the vision references extant readme structure. the blueprint adds a row in the same format.

---

## misinterpretation search

### potential misinterpretation 1: wildcard scope

**question:** does wildcard include future boot events claude code might add?

**vision says:** "all boot triggers" (current set)

**blueprint says:** hardcoded array of 3 events

**analysis:** the blueprint addresses current capabilities. future events would require a code update. this is acceptable — the vision does not promise automatic inclusion of future events.

**verdict:** no misinterpretation

---

### potential misinterpretation 2: matcher for boot events

**question:** should boot events have a matcher pattern?

**vision says:** "filter.what determines event, not matcher"

**blueprint says:** matcher = '*' for all boot events

**analysis:** boot events have no subject to match. SessionStart, PreCompact, PostCompact fire unconditionally (no tool name to pattern match). the blueprint correctly uses '*' as a placeholder.

**verdict:** no misinterpretation

---

### potential misinterpretation 3: reverse translation of wildcard

**question:** if we wrote wildcard, how do we read it back?

**blueprint says:** reverse translation handles individual events, not wildcard

**analysis:** when wildcard expands to 3 entries, each entry is written separately. read-back sees 3 separate hooks. this is correct — round-trip produces semantically equivalent result (3 hooks instead of 1 wildcard).

**verdict:** no misinterpretation — semantic equivalence preserved

---

## lessons

### lesson 1: deeper checks matter

surface-level adherance ("did we mention it?") is necessary but not sufficient. deeper checks ("is the interpretation correct?") catch subtle misalignments.

### lesson 2: reverse operations reveal intent

the reverse translation (claude code → rhachet) reveals the original intent. if SessionStart reverse-translates to onBoot without filter, we've preserved backwards compat. if it added filter.what=SessionStart, we'd annotate the original.

### lesson 3: discovered bugs are in scope

the del method bug wasn't in the original wish. but once r1 discovered it, the blueprint must address it. to ignore known bugs would be a misinterpretation of "make it work correctly."

---

## final verdict

| blueprint element | vision/criteria intent | adherance |
|-------------------|----------------------|-----------|
| translateHook.ts extend | extend, not replace | correct |
| no filter → SessionStart | backwards compat | correct |
| filter.what → event | event selector | correct |
| wildcard → all 3 | all boot triggers | correct |
| invalid → error | fail fast | correct |
| test coverage | all 6 usecases | correct |
| reverse translation | round-trip integrity | correct |
| del fix | bug discovered in r1 | correct |
| type extension | type safety | correct |
| supplier brief | document usage | correct |
| readme link | discoverability | correct |

**verdict: ADHERES** — all blueprint choices correctly interpret vision and criteria intent. no misinterpretations found.
