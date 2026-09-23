# F33 — the loop-stall cure is deferred once its cause is unidentified

- **rework** = clean — the deferral is a dream plus a named next instrument; to take it up later costs
  no rework of any shipped code, because no cure was written
- **status** = open, for the wisher
- **confidence** = 90% that deferral is right; 55% that the block sits outside this wish's machinery

## .the fork, stated fairly

the 30s `clone say` wedge recurred on `clone.joker.realbrain` `[t3]`, and the daemon's lag watch
measured its class for the first time: `clone daemon event loop stalled 30034ms`.

| the option | what it costs |
|---|---|
| **A — cure it now** | the mechanism is unnamed, so the cure is a guess. the obvious suspect (the always-on emulator) is ruled OUT by magnitude — see the table below — so a guess would most likely harden the wrong surface |
| **B — halt and escalate** | the wedge is already reported loudly and correctly; a halt spends the wisher's attention on a defect the contract already surfaces honestly |
| **C — defer with a dream and a named next instrument** ✅ taken | the wedge stays live and intermittent. an acceptance suite keeps one flaky case |

## .taken, and why at the time

**C.** three candidates on the dispatch path were ruled out by measurements that already existed:

| candidate | its measured bound | short by |
|---|---|---|
| the screen read | **2.38ms** at the scrollback cap | four orders of magnitude |
| the emulator settle | **250ms**, unconditional | two orders |
| the submit-ready wait | **5,000ms**, and it `await`s each poll | one order, and it yields |

⇒ so the honest state is **measured that the loop stalled, never measured what stalled it**, and
`rule.forbid.mechanism-inferred-from-outcome` forbids a cure pitched at that state. the deferral buys
the one item a guess cannot: a decisive next instrument that can **exonerate** the screen feed rather
than merely harden it.

## .the rework, and why it is clean

no cure was written, so there is no code to unwind. what the round leaves behind is additive and each
piece stands alone:

- the lag watch — already shipped, and it is what produced the measurement
- the dream — carries the three ruled-out candidates and the four-step next instrument
- this row

⇒ to take it up later is to build the phase latch and read the same trace again. no caller is hardened
against it, so reversal costs a read rather than a teardown.

## .confidence, and why it is not higher

- **90% on the deferral** — the residual is that a wisher may rank one flaky acceptance case above the
  risk of a guessed cure, which is a scope call rather than a technical one
- **55% on the location** — every ruled-out candidate points away from this wish's machinery, and 55%
  is honest rather than modest: three candidates eliminated is not a positive identification
  elsewhere, and the daemon holds surfaces this round did not read

## .where

- `src/domain.operations/clone/genCloneLoopLagWatch.ts` — the instrument that settled the class
- `src/domain.operations/clone/screen/genCloneScreenFeed.ts` — the exonerated-by-magnitude suspect
- `src/domain.operations/clone/socket/awaitCloneSubmitReady.ts` — the 5,000ms bound
- `.dream/2026_09_20.clone-daemon-event-loop-stalls-31s-with-no-named-cause.dream.md` — the work owed

## .the verdict, once ruled

(unruled)
