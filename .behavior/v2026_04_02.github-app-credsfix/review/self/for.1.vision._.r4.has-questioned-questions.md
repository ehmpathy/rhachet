# self-review r4: has-questioned-questions (final triage)

## the guide asks

> for each question, ensure it is clearly marked as either:
> - [answered] — now
> - [research] — later
> - [wisher] — requires wisher input

## triage complete

### questions marked [answered] — 4 total

| # | question | answer | source |
|---|----------|--------|--------|
| 1 | where does truncation occur? | `promptHiddenInput.ts:23` | code inspection |
| 2 | readline vs read-all issue? | yes, `rl.once('line')` | code inspection |
| 3 | other code paths affected? | yes, `promptVisibleInput.ts` | grep search |
| 4 | where does keyrack live? | this repo (rhachet) | grep search |

**why these hold**: each confirmed via direct code inspection. no inference needed.

### questions marked [research] — 0 left for root cause

all root cause questions answered via code.

### questions marked [wisher] — 0

no questions require wisher input. the bug and fix are clear.

### research items left — 2 (test authorship)

| # | item | status |
|---|------|--------|
| 1 | add unit tests with multiline json | [research] |
| 2 | add acceptance test with RSA-like content | [research] |

**why these remain**: these are implementation tasks, not questions. they'll be done in execution phase.

## are there any questions I missed?

### potential question: should we fix both files or just promptHiddenInput?

**answer**: both. `promptVisibleInput.ts` has the same bug. a fix to only one would leave the other broken.

**status**: [answered]

### potential question: what's the best fix approach?

**options**:
1. accumulate lines with `rl.on('line', ...)` then join
2. read entire stdin with `process.stdin.read()` or stream
3. use async iterator pattern

**answer**: option 2 or 3 preferred — simpler, no line accumulation needed.

**status**: [answered] — implementation detail, not a blocker.

### potential question: could this break backwards compatibility?

**answer**: no. to read ALL stdin is strictly more correct. any caller that expected truncation... was broken anyway.

**status**: [answered]

## final summary

- 4 questions [answered] via code
- 0 questions [research]
- 0 questions [wisher]
- 2 research items for test authorship (implementation phase)

the vision is complete. all questions triaged. ready to proceed.
