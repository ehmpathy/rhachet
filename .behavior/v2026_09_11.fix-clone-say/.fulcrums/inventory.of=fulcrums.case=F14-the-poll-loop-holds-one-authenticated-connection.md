# fulcrum F14 — the poll loop holds ONE authenticated connection, over reconnect-per-tick

**rework** dirty · **status** OPEN · **confidence** 60%

## .the fork

the r011 (arch-defects) L3 review, finding 1: `getCloneSayObservation`'s poll loop calls
`getCloneInputStateOrBlind` (→ `getCloneInputState`) every `pollMs`, and `getCloneInputState` opens
a BRAND-NEW socket connection each cycle (`connectToClone` → `socket.destroy()` in `finish`). every
new connection that sends a data frame triggers `isCallerSameUser` → `getSocketPeerCred`, which shells
out `sh → ss -xp → grep` and scans the WHOLE host's unix socket table. so a `say --await release`
against a busy target can, worst case (~60 polls at 250ms over the 15s bound), spawn ~180 processes
and run ~60 whole-host `ss` scans — and the cost scales with total live sockets on the host, i.e.
worse exactly under the vision's own case=7 "one daemon hour, many clones" scenario. this works
against the wish's stated goal of a CHEAP, pollable read channel.

two ways to close it:

- **option A — hold one connection open.** the poll loop authenticates once, then sends repeated
  `probe` frames over the held connection; `getCloneInputState` stays the one-shot API (baseline +
  any future standalone caller), and the loop gets a session-scoped variant. this is the fix
  direction the reviewer names.

  ⇒ **update:** the finding-3 shared-communicator extraction (r11.n3, dream #4) has since LANDED —
  `exchangeOnCloneSocket<T>` is extracted and both callers consume it (verified: types · 128 unit ·
  48 integration). so option A no longer bundles an extraction with a rework; the persistent-session
  mode is now a bounded change to a single extant communicator. that SHRINKS option A's surface but
  does NOT make it clean — a held, multiplexed connection still re-shapes the exchange's
  connect→write→settle→destroy contract into a request/reply-correlated held session, which is its own
  review surface. it remains a dedicated-PR follow-on, and the coupling that made it dirty is now
  concentrated in `exchangeOnCloneSocket` rather than spread across two hand-copied call sites.
- **option B — defer it, itemized (this fulcrum).** ship the bounded read channel now; defer the
  connection-lifecycle refactor to a follow-up.

## .taken, and why

**option B — deferred, itemized here.** three reasons the deferral is defensible for THIS stone:

1. **the worst case is bounded and opt-in.** the DEFAULT `--await` target is `enqueue`, whose
   short-circuit returns after the first settled cycle (`getCloneSayObservation.ts` — the
   `cyclesElapsed >= 1` enqueued-shape return), so a typical say polls ~2 cycles, not 60. the
   ~60-cycle cost needs `--await release` AGAINST a brain that holds the message the full 15s — a
   narrow worst case, not the common path.
2. **the fix is DIRTY.** option A changes the connection lifecycle (auth-once vs auth-per-frame),
   touches `connectToClone`'s destroy-in-`finish` contract, and couples with the r11.n3
   shared-communicator extraction. that is a rippling wire-layer refactor, exactly the "smuggled
   refactor under scouts-honor" this repo forbids landing late in a stone with no independent review.
3. **the reviewer itself graded it "blocker-leaning," not a hard blocker** — and the underlying
   per-connection cost is PRIOR to this wish (`getCloneInputState` already reconnected per call before
   this stone); the wish AMPLIFIES the call frequency via the new poll loop rather than introducing
   the reconnect cost.

⇒ so the perf concern is captured as an OPEN fulcrum + a caught dream rather than silently dropped,
and the wisher prices the dirty refactor against the bounded worst case.

## .also folded in — the r011-i007 arch-defects re-review

the re-review (i007 r011) added one note to this fulcrum's account, and one small mitigation LANDED
this round:

- **a THIRD per-tick cost, informational.** the two costs named above are the per-cycle socket
  reconnect+auth and the `O(scrollback)` grid materialization. the re-review flagged a third of the
  same shape on the filesystem side: each poll cycle also runs `genCloneHistoryRelink` (an actor-record
  read + an idempotent link findsert) before the transcript count. no new fulcrum — whoever does option
  A's rework should batch all THREE per-tick costs, not two.
- **the per-probe reply is now BOUNDED (r011-i007-n2, landed).** `getCloneInputStateOrBlind` now
  forwards `replyTimeoutMs`, and the poll loop passes `CLONE_SAY_PROBE_REPLY_MS` (1000ms). so a single
  stuck probe can no longer eat a third of the 15s budget — the loop keeps its cadence even under the
  auth-gate `ss` slowness. this is a CADENCE guard, NOT the connection-lifecycle fix: the per-cycle
  reconnect + whole-host `ss` scan + relink costs themselves are untouched, and their removal
  (auth-once, one held connection) remains option A's dedicated-PR rework. it narrows the 40% doubt (a
  busy `--await release` no longer stalls per cycle) without a close of the fulcrum.

## .rework — dirty

option A is not additive: it re-shapes the socket-connection lifecycle (a held, re-used connection
vs the current connect-send-destroy-per-call), which `exchangeOnCloneSocket` and the frame reassembly
both rest on. the r11.n3 extraction of the duplicated client-wire protocol has LANDED, so option A no
longer bundles that extraction — but it still turns the single-exchange communicator into a
multiplexed held-session one, a request/reply-correlated contract change with its own review surface.
a reversal of the deferral is a real teardown of the per-call connection model, so it is a
fulcrum-council call, never a best-guess this round.

## .confidence — 60%, and why

60% that the deferral is right for THIS stone: the bounded/opt-in worst case + the dirtiness of the
fix + the prior nature of the per-connection cost all support shipping now. the 40% doubt is real and
larger than the other clean fulcrums': the concern lands DIRECTLY on the wish's own thesis ("a cheap,
pollable read channel"), so a wisher who weights case=7 concurrency heavily may rule that option A
belongs IN this stone rather than after it.

## .where

- the r011 given — `.reviews/peer/5.1.execution.from_vision._.review.i004.1fea0181274cdebb5f.r011._.given.by_peer.enroll-impl-arch-defects.md` (finding 1)
- the poll loop — `src/domain.operations/clone/socket/getCloneSayObservation.ts`
- the per-call connect/destroy — `src/domain.operations/clone/socket/getCloneInputState.ts`
- the per-connection auth shell — `isCallerSameUser` / `getSocketPeerCred` (the `ss -xp` scan)
- the caught dream — `.dream/2026_09_13.persistent-session-poll-connection.dream.md` (the sole
  surviving deferral under the zero-deferrals directive: a dirty wire-layer rework that deserves its
  own dedicated PR)
- the landed communicator — `src/domain.operations/clone/socket/exchangeOnCloneSocket.ts` (r11.n3 /
  dream #4, no longer deferred)

## .the demos that RENDER this call

**NONE.** no `case=N` demo renders the connection lifecycle — the seven demos render probe/verdict
shapes only. a verdict on F14 (hold-one vs reconnect) changes no demo and seeds no criteria assertion;
it is a pure implementation-strategy fork.
