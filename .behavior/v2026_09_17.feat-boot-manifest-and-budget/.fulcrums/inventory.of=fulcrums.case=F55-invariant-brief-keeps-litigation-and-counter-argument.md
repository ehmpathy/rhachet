# F55 — does an invariant brief keep its `.the litigation` and `.the counter-argument` sections?

- **raised** = 2026-09-29, at `5.1.execution.from_vision`, `review.peer i010` —
  `repo-rules` blocker.1
- **rework** = clean
- **status** = OPEN — **keep both**
- **confidence** = **88%**

## .the fork, stated fairly

`define.invariant.a-symlink-under-agent-is-foreign.md` carries a `.the litigation` section (the
realpath escape check, and why the symlink test answers the question) and a
`.the counter-argument, stated fairly` section (a repo-made link reads as foreign, and why that holds).
the reviewer reads both as revision-accretion under `rule.forbid.revision-accretion-in-deliverables`.

| | **keep both sections** (taken) | **trim to one sentence** |
|---|---|---|
| `im_an.obsessive_learner.for.domain.invariants` | ✅ satisfies shape fields 6 and 7, both required | 🔴 omits two required fields |
| a reader who would re-argue the rival test | finds the argument already settled | re-derives it from scratch |
| a reader who wants only the invariant | reads `.the invariant` and `.scope` first | same |

## .the call, and why

**keep both.** the learner brief that governs invariant briefs names `.the litigation` and
`.the counter-argument` as shape fields, and states that the fields a conclusion-only rule omits are
the ones a re-litigation needs. an invariant stated with no argument is re-argued, or quietly
reversed. the two sections state a live argument about the current design — which test is used and
why — never a prior draft of the brief, so neither is revision history.

## .why the confidence is 88%

the two rules pull in opposite directions on the surface, and a council may prefer the argument move
to a `.reason` peer file. the substance survives either way.

## .rework

clean — move both sections into a `define.invariant.a-symlink-under-agent-is-foreign.reason.md` peer
and leave a one-line pointer.
