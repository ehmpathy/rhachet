# fulcrum F21 — `genCloneSocketServer.ts` bundles three separable concerns

surfaced by the r011 (enroll-impl-arch-defects) L3 review of `5.1.execution.from_vision`,
decompose-for-recompose item 2. a **dirty** refactor, deferred to a dedicated PR with a caught
dream.

## .the fork stated fairly

`genCloneSocketServer.ts` is 532 lines with 14 internal imports — the highest fan-in file in the
feature — and bundles three separable concerns: (a) the dequeue-write closure, (b) the
bind-lifecycle state machine (which carries its own docblock essay), (c) per-connection frame
dispatch. (a) and (b) are each independently unit-testable if extracted; today both are reachable
only through the 1124-line socket integration test.

| option | the shape | cost |
|---|---|---|
| **A — current** | one 532-line file holds all three concerns | (a) and (b) untested at unit grain — reachable only through the 1124-line integration test |
| **B — split into three** | `computeCloneDequeueWrite` + `genCloneSocketBind` + a thin frame-dispatch composer | a structural refactor of the feature's central file across 14 import sites + the integration test |

## .taken, and why at the time

**A (current), deferred.** the file is correct as-is (the reviewer graded it a nitpick, not a
blocker) — only large. B is a large structural refactor of the highest-fan-in file, exactly the
"massive dirty refactor that deserves its own dedicated pr" the driver directive carves out.
deferred; the fix shape (extract order, clamp plan) is in the caught dream.

## .rework, and why

**dirty.** B ripples across 14 import sites, the socket integration test, and the bind lifecycle;
the ~200-line state-machine extraction is itself a substantial move. not a local fix.

## .confidence 72%, and why it is low

the split is sound design and would buy unit-grain coverage of (a)/(b) — but the exact seams
(is (a) a pure `compute` or a closure factory `gen`? does frame dispatch stay in the composer or
move too?) are design calls a dedicated PR should settle with the code in front of it, not
pre-commit here.

## .where

`genCloneSocketServer.ts` (the whole file) + its 14 import sites + the socket integration test.

## .the demos that RENDER this call

**NONE.** no `case=N` demo references the internal decomposition of `genCloneSocketServer` — the
split is a structure refactor with no rendered surface. a B verdict changes no demo.

## .the verdict

unruled. deferred to a dedicated PR — dream:
`.dream/2026_09_14.split-gen-clone-socket-server-into-three-concerns.dream.md`.
