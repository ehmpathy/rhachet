# self review — 1.vision — has-questioned-questions

## issues found, and how each was fixed

1. **no triage marks.** the open-questions section listed "assumed", "unverified", and "not
   adopted" items, but none carried `[answered]`, `[research]`, or `[wisher]`, so a reader could
   not tell which ones block on a person. fixed: every item is now marked, and phrased as the
   question it answers.
2. **two `[wisher]` items had no default.** a wisher who never replies would leave execution
   stalled on them. fixed: each states the default execution takes if unanswered (F3: no; F6:
   defer), both clean to rework.
3. **one question answerable now was buried as an assumption** — whether CI has `ss`. it was in
   the assumptions review, not the vision. fixed: added as `[answered]` with the evidence (the
   extant socket-server integration tests drive the real gate and pass in CI).

4. **`[research]` assumes a research phase this route lacks.** the route runs vision →
   execution → verification; there is no research stone. fixed in place: the `[research]` item
   already says it is owed "first in execution, before any code rests on it", and F7 records it as
   "measurement owed". that is where the answer will land.
5. **the fulcrum summary listed F7 above F6, and its status column did not show which two were
   put to the wisher.** fixed: rows in order, and F3 / F6 now read "asked of the wisher".

6. **an unasked question: at what grain does the clamp sit?** the vision had picked the gate grain
   (`isCallerSameUser` under `awaitCloneAuthGate`) and never put the question. a read of the
   extant harness (`genCloneSocketServer.integration.test.ts:36-80`) shows it stands up the real
   server in-process with the real gate wired — `isCallerSameUser` is not injected. so the wish's
   own outcome ("a same-user say on a loaded box is accepted") can be clamped at the grain that
   holds it, for the same 9s cost. fixed: the clamp is now a new case in that file (`sayClone` →
   delivered, sink holds the message + submit, no auth-error trace); the question is listed as
   `[answered]`; F5 and case=1's `[tn]` follow. one care for execution, by logic: the fake `ss`
   rides `process.env.PATH`, and the file's other cases run in the same worker, so the swap must
   be set and restored inside the new case's own `beforeAll` / `afterAll` (cases in one file run
   in sequence, so a scoped swap cannot leak into a neighbour mid-run).

## triage, and why each mark holds

| question | mark | why that mark |
|---|---|---|
| the clamp's grain | [answered] | extant code + logic: the server harness wires the real gate, so the outcome grain costs no more than the part grain |
| gate margin above the lookup bound | [answered] | logic decides it: any margin that covers the post-kill settle; the derivation keeps the order. the exact value is taste, flagged as F1 |
| keyrack daemon's 5s bound | [answered] | the wish text names the clone socket only. code cannot answer scope; the wish did |
| CI has `ss` | [answered] | extant code proves it: real-gate integration tests pass in CI |
| say accepted past the 30s wedge | [wisher] | only the wisher knows whether "accepted" was meant to hold past the client's window. code shows what is, not what was meant (`rule.forbid.dropped-behavioral-requirements`) |
| exec timeout settles a pipeline at its bound | [research] | a fact about the runtime, answerable by a measurement in seconds. not logic (the docs leave the pipeline case to inference), not the wisher. owed first in execution, before any code rests on it |
| scan pile-up acceptable, or abort now | [wisher] | a cost/scope trade only the wisher can weigh |
| the issue's other cures | [answered] | the wish text scopes to the two bounds |

no question was marked `[wisher]` that logic or code could close, and none was marked
`[answered]` from code where it asked what was meant.
