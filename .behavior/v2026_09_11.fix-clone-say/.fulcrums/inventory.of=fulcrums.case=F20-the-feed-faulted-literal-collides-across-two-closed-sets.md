# fulcrum F20 — the `'feed-faulted'` literal collides across two closed sets

surfaced by the r011 (enroll-impl-arch-defects) L3 review of `5.1.execution.from_vision`,
decompose-for-recompose item 1. a **dirty** refactor, deferred to a dedicated PR with a caught
dream.

## .the fork stated fairly

the literal `'feed-faulted'` is a member of two unrelated closed types — `CloneOperationalRejectReason`
(pre-write dequeue reject) and the verdict-reason set consumed by `REASON_COPY` / `DEGRADE_COPY`
(post-write observe-degrade) — with two different prose strings, reached by two code paths. no
type couples them.

| option | the shape | cost |
|---|---|---|
| **A — current** | two closed sets each own `'feed-faulted'`, strings agree in sense by hand | silent-drift risk: an edit to one copy leaves the other stale, no type or test catches it |
| **B — shared taxonomy** | one `CloneScreenFeedReason` module owns the literals; both paths import it | a cross-type extraction that ripples into three copy tables, two files, their consumers, every affected snapshot |
| **C — rename one** | `'feed-faulted-at-dequeue'` on the reject path, so the literal names one concept | a literal rename across one closed set + its snapshots |

## .taken, and why at the time

**A (current), deferred.** the two strings are consistent in sense today (the reviewer graded it
a nitpick, not a blocker), so no defect ships. B and C both ripple across the
`computeCloneOperationalRejectClass` path, which is outside this wish's screen-read scope. deferred
to a dedicated PR; the fix shape is in the caught dream.

## .rework, and why

**dirty.** B/C touch three copy tables, two files, all consumers, and every snapshot that renders
the affected reason strings, AND reach the reject-class path this wish does not own — a
cross-boundary refactor, not a local fix.

## .confidence 70%, and why it is low

the collision is real and the drift-risk is real, so a future PR is likely warranted — but whether
the repair is B (shared taxonomy) or C (rename) depends on whether the two concepts are genuinely
one (a faulted feed) or two (a dequeue-reject vs an observe-degrade), which is itself a model call
i did not settle here.

## .where

`computeCloneOperationalRejectClass.ts` (`CLONE_OPERATIONAL_REJECT_COPY`) ·
`computeCloneSayReport.ts` (`REASON_COPY` / `DEGRADE_COPY`).

## .the demos that RENDER this call

**NONE.** no `case=N` demo asserts the identity or distinctness of the two `'feed-faulted'`
members — the collision is an internal-taxonomy fact, not a rendered surface. a B/C verdict changes
no demo.

## .the verdict

unruled. deferred to a dedicated PR — dream:
`.dream/2026_09_14.a-shared-reason-taxonomy-resolves-the-feed-faulted-name-collision.dream.md`.
