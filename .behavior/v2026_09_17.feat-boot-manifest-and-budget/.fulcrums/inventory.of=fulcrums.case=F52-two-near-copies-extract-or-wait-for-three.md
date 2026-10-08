# F52 — two near-copies: extract now, or wait for the third?

- **raised** = 2026-09-28, at `5.1.execution.from_vision`, `review.peer i006` — `repo-rules-tests`
  nitpick.1 (two local `asSnapshotSafe` redactions) and `enroll-impl-arch-defects` nitpick.1 (the
  root and per-actor routines in `syncHooksForLinkedRoles`)
- **rework** = clean
- **status** = OPEN — **wait**
- **confidence** = **85%**

## .the fork, stated fairly

| | **extract a shared helper now** | **wait for the third instance** (taken) |
|---|---|---|
| copies | one | two |
| drift risk | none | a change to one must be mirrored by hand |
| shape of the helper | 🔴 a parameter per difference — the two `asSnapshotSafe` copies mask one name vs two; the two sync routines differ in target dir and in how a fault is tallied | no helper to shape |

## .the call, and why

**wait.** `rule.prefer.wet-over-dry` sets the bar at three usages, and both pairs sit at two. each
pair differs in a way a shared helper would absorb as parameters, which is the premature-abstraction
signal the rule names. both reviewers graded the concern a nitpick and named the rule themselves.

## .why the confidence is 85%

the sync pair's drift risk is real — one side once missed a tally field. a third caller, or a second
drift, settles it toward extraction.

## .rework

clean — extract `asSnapshotSafe` to `src/.test/`, and the sync step to one per-target routine.
