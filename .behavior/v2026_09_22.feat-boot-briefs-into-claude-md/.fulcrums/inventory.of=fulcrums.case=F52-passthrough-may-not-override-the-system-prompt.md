# F52 — a passthrough may not override the system prompt

## .the fork

- **a.** forward a passthrough `--system-prompt` beside rhachet's own `''`
- **b.** refuse it, exit 2, before any write — and allow the additive `--append-system-prompt[-file]`

## .taken — b, and why at the time

with two `--system-prompt` values in one argv, the cli's own parse order picks the winner. that is a silent fork of the one prompt every clone of an actor must share, and the sync invariant forbids it. a refusal names the additive flag that fits the same need.

## .rework

**clean** — delete one call in `invokeEnroll.ts` and the operation it calls.

## .confidence — 88%, and why it is low

an operator who wants a custom BASE prompt for one enroll now has no path. whether that need is real is the wisher's call, never proven here.

## .where

`assertBrainCliPassthroughLeavesSystemPromptOwned.ts` (+ unit test, 13 rows) · `invokeEnroll.ts` · `enroll.acceptance` system-prompt case `[t2]` `[t3]`
