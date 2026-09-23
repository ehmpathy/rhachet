# fulcrum F10 — the server pre-check drains the async parse before it reads

**arose:** 5.1.execution.from_vision, r007 (arch-hazards-behavior) blocker.1
**rework:** dirty · **status:** RESOLVED (option B taken) · **confidence:** 55% → 100%

## the fork, stated fairly

`@xterm/headless` parses `term.write(data)` async (~28ms measured). the two SERVER read sites
(`genCloneSocketServer.ts:114` dequeue pre-check, `:207` probe) read the grid once, sync. so a say
dequeued in the ~28ms window right as a human's keystroke echo lands can read the box as `clear`
before the dirty input parses — and paste over the human (the case=2 clobber this feature exists to
close), intermittently.

- **option A (shipped):** a single sync read at each server site; the CLIENT observe path
  (`getCloneSayObservation`) polls to absorb the lag, but the server pre-check does not.
- **option B (the reviewer's):** `term.write(data, callback)` + a `whenSettled(): Promise<void>` on
  the feed, awaited before each server read — a deterministic drain of parses of chunks fed so far.

## what was taken, and why

**deferred to a wisher/next-stone verdict — not best-guessed, not silently shipped as fixed.** the
race is real and acknowledged in the r007 `.taken`. option B is the right target but it is NOT a safe
best-guess for three reasons:

1. **Q25 is unrun** — whether the per-chunk callback reliably fires (and on a parse error / disposed
   term on the V15 fault path) is exactly Q25, an open vision measurement. a `whenSettled()` that
   awaits a callback that never fires HANGS the dequeue path → a wedged, permanently-deaf clone,
   strictly worse than the intermittent clobber.
2. **a unit clamp has no teeth** — a fake feed passes regardless of real xterm semantics; the honest
   clamp is the realbrain capture under real pty load (Q25). per `rule.require.clamp-edge-cases`, a
   toothless clamp is worse than absent.
3. **the safe-default covers the default path** — `--force` OFF means a dirty region REFUSES, so the
   un-forced clobber is only the residual window B would tighten.

## rework, and why dirty

`readScreen` is a REQUIRED INJECTED field (V18) reached at multiple construction sites (V19). a
`whenSettled` seam ripples the socket-server input type, every construction site, and every fake-feed
test — callers hardened against the current sync contract. plus a hang-safe drain needs a timeout
bound set by Q25's measured lag.

## confidence, and why low (55%)

the DIRECTION (a drain is better than a single read) is high-confidence; the 55% is on whether B is
implementable hang-free without Q25, and whether the residual (un-forced, sub-28ms, keystroke-coincident)
window justifies the dirty ripple now vs after the measurement.

## where

`genCloneScreenFeed.ts:91` (`term.write` no callback) · `genCloneSocketServer.ts:114,207` (the two
sync reads) · `CloneScreenFeed` interface (`genCloneScreenFeed.ts:46-57`).

## the verdict, once ruled

**option B, landed 2026-09-18.** the deferral rested on ONE measurement-gated premise — *"a guessed
drain HANGS the clone"* — and r002 (repo-rules-artifacts) blocker.2 was right that the premise was
measurable now rather than next stone. so it was measured, and it is FALSE.

⇒ `.agent/.notes/tool.probe-xterm-write-drain.js`, four edges, `@xterm/headless` 6.0.0:

| edge | result |
|---|---|
| 1 — does `write(data, cb)` fire `cb`? | ✅ yes, in 2ms, with the chunk in the grid |
| 2 — does it fire AFTER `write()` returns? | ✅ yes — so an `await` is real, never a same-tick no-op |
| 3 — does an EMPTY write fire its callback? | ✅ yes, on a fresh parser AND on an already-idle one |
| 4 — do two queued writes drain in issue order? | ✅ yes |

edge 3 is the one the whole seam rests on: `term.write('', cb)` queues its callback behind every
prior chunk, so an await on it means *"the read that follows me is current."*

### each deferral reason, answered

1. **~~a guessed drain hangs~~** — refuted by edge 3, and then made *impossible* rather than merely
   improbable: the drain carries an unconditional `SCREEN_SETTLE_TIMEOUT_MS = 250` fallback (rung 1 of
   `rule.prefer.prevent-over-correct`'s ladder). a callback that is dropped, coalesced, or lost to a
   future emulator version cannot wedge the loop — the timer finishes the promise regardless, and an
   elapsed bound is NOT a fault, since the grid is then merely as current as the extant unsettled read.
2. **~~a unit clamp has no teeth~~** — answered by construction, in two halves. `[case7]` in
   `genCloneScreenFeed.test.ts` drives the **REAL** emulator and asserts the un-settled read MISSES a
   just-fed chunk with **no poll and no timer** — every other case in that file reaches for
   `waitUntilRendered` to absorb the parse lag; this one *exhibits* it. `[case8]` uses a fake whose
   `write()` drops the callback, and clamps only the timeout bound. both were dogfooded:

   | mutation | result |
   |---|---|
   | `term.write('', finishOnce)` → `finishOnce()` | 🔴 2 red in `genCloneScreenFeed.test.ts` |
   | `await input.settle()` deleted from the dequeue gate | 🔴 2 red in `[case18]` |

   🟡 and the first draft of `[case18]` had **no teeth** — it invented fixtures (`'─'.repeat(40)`,
   `'> '`) instead of a reach for `[case17]`'s, 30 lines above. since `>` is not the glyph the
   classifier strips, the un-drained state and the drained state BOTH read `dirty`, so the verdict was
   identical either way. caught by the mutation, repaired by reuse
   (`rule.always.reuse-pavement-before-improvise`), and the miss is recorded in the test's own comment
   so a future author does not repeat it.
3. **~~the safe-default covers it~~** — true and not a reason to keep the residual, once 1 and 2 fell.

### the rework, measured against the estimate

the estimate said dirty. it landed at 3 prod files + 6 test files — the ripple `tsc` found, all of it
inside one subsystem already in this diff:

- `genCloneScreenFeed.ts` — the `settle` barrier, the bound, the interface field
- `genCloneSocketServer.ts` — `settle` as a REQUIRED input (V18); `await input.settle()` before the gate read
- `genBrainCliPtyClone.ts` — wires the feed's settle, or a no-op when no emulator is live (the read
  already degrades to `feed-not-live`, so the gate withholds on capability rather than on a stale read)

gates after: types ✅ · lint ✅ · format ✅ · unit 4033/0/0 ✅ · integration 1413/0/14-skipped ✅.

⇒ the dream that held this deferral is **deleted**, not merely amended — its three shape-of-the-fix
items all landed, so a queue entry for it would be a lie. it is cited by no live path
(`rule.always.reuse-pavement-before-improvise`'s phantom-path clause: a retired artifact leaves no
pointer behind). git holds it at `2026_09_14.server-precheck-drains-async-parse-before-read`.
