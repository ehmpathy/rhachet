# F1 — a caller with `CLAUDECODE` and no depth var reads as depth 0

**the fork:** (a) keep the absent depth var as "human, depth-free" · (b) read `CLAUDECODE=1` with
no depth var as a depth-0 brain, so its children mint at depth 1.

**taken first:** (b), on the read that the wish's defect was a review clone that reads as
top-level.

**reversed to (a), 2026-10-07.** the wisher's report is the opposite failure: a top-level clone's
reviewers are **refused**. (b) would cause exactly that — a human who enrolls from inside their
own `claude` session gets a depth-1 clone whose guard cannot enroll reviewers. the enrolled
`enroll-vision-intent` reviewer graded it `[blocker][urgent]` (i006). to block a legit top-level
spawn is worse than one extra level under a hand-launched brain. the reported block's real cause
is an inherited depth var, fixed by F6.

**rework:** clean — the read is simply not added.

**confidence:** 85%. the cost of (a): a reviewer that a hand-launched `claude`'s guard enrolls is
depth 0 and may spawn once more. the wisher may still want that level closed, which needs a
signal that does not also catch a human's in-session enroll.

**where:** `src/domain.operations/spawn/asCloneSpawnDepth.ts`.

**verdict:** —
