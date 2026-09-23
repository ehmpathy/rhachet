# fulcrum F22 — the clone-say latency tunables are spread across four files

surfaced by the r011 (enroll-impl-arch-defects) L3 review of `5.1.execution.from_vision`,
maintenance-hazards item. a **dirty** refactor, deferred to a dedicated PR with a caught dream.

## .the fork stated fairly

latency tunables for this one feature live in 4 files — `clone/constants.ts`,
`socket/constants.ts`, `socket/constants.bind.ts`, plus two locals in `getCloneSayObservation.ts`
(`CLONE_SAY_POLL_MS_MIN = 250`, `CLONE_SAY_PROBE_REPLY_MS = 1000`) — plus two unnamed inline
defaults (`getCloneInputState.ts:29`, `connectToClone.ts:23`). no one has a single place to tune
the latency budget.

| option | the shape | cost |
|---|---|---|
| **A — current** | six latency values across four files + two inline literals | no single home; two values unnamed (magic numbers); a tuner reconciles six places |
| **B — consolidate** | one `socket/constants.latency.ts` owns all six, each with its rationale | a move across every consumer import that also touches a proven-latency path (case=5) |

## .taken, and why at the time

**A (current), deferred.** the reviewer graded it a maintenance nitpick, not a blocker — the values
are correct, only scattered. B looks mechanical but lands in a load-critical path: the case=5 race
guard rests on the `CLONE_SAY_POLL_MS_MIN = 250` floor, so a careless move risks a subtle latency
regression a unit test cannot catch. deferred to a dedicated PR with a case=5 re-run; the fix shape
(and the verbatim-rationale-preserve requirement) is in the caught dream.

## .rework, and why

**dirty.** B ripples into every consumer import AND touches a proven-latency invariant (the 250ms
floor the case=5 acceptance rests on) — so it needs a case=5 re-run, not just a mechanical move.
that elevates it past a scouts-honor CLEAN fix.

## .confidence 68%, and why it is low

the consolidation is a real maintainability win, so a future PR is likely warranted — but the
250ms floor is empirically tuned and its move risks a regression no unit clamp catches, so whether
B is worth the case=5-re-run cost (vs the values left documented-in-place) is a judgment a
dedicated PR should weigh, not this one.

## .where

`clone/constants.ts` · `socket/constants.ts` · `socket/constants.bind.ts` ·
`getCloneSayObservation.ts` (two locals) · `getCloneInputState.ts` · `connectToClone.ts`.

## .the demos that RENDER this call

**NONE.** no `case=N` demo asserts a constant's file location — the tunables' home is an internal
structure fact. a B verdict changes no demo (the case=5 acceptance asserts BEHAVIOR at 250ms, not
the constant's location).

## .the verdict

🔴 **RULED — B, taken in this PR.** the `repo-rules-artifacts` lane raised the deferral as a blocker
against `rule.forbid.deferrals-short-of-a-dedicated-pr`, and it is right on the letter: that rule's
own table names *"a scope-cut nitpick"* and a measurement-gated wait as excuses that do NOT clear
the dedicated-PR bar. a move of four values with their docblocks intact is mechanical, so it never
reached the *"massive dirty refactor"* the one exception requires.

what the deferral argument got wrong, precisely: it graded the RISK of the 250ms floor rather than
the SIZE of the change. the floor's value is unchanged — `CLONE_SAY_POLL_MS_MIN = 250`, with its
rationale docblock carried verbatim — so there is no latency delta for a case=5 re-run to catch.
a move that changes no number cannot regress a number.

⇒ the `rework` and `confidence` fields above are the read AT THE TIME and are left unedited, because
a fulcrum's value is the argument rather than the conclusion. this verdict is what overturned them.

### what landed

| value | was | now |
|---|---|---|
| `CLONE_SAY_POLL_MS_MIN` | a local in `getCloneSayObservation.ts` | `socket/constants.ts`, docblock verbatim |
| `CLONE_SAY_PROBE_REPLY_MS` | a local in `getCloneSayObservation.ts` | `socket/constants.ts` |
| `5000` | an unnamed inline default, `getCloneInputState.ts` | `CLONE_PROBE_REPLY_DEFAULT_MS` |
| `2000` | an unnamed inline default, `connectToClone.ts` | `CLONE_CONNECT_TIMEOUT_MS` |

🟡 **and the home is `socket/constants.ts`, never the `socket/constants.latency.ts` option B named.**
that file already holds every other wire latency tunable — the submit delay, the wedge window, the
auth gate — so a third constants file in one directory would fragment the budget the move exists to
consolidate. the same shared-reader test that sent the bind bounds to `constants.bind.ts` keeps
these here, and the file's final note now states both halves of that split.
