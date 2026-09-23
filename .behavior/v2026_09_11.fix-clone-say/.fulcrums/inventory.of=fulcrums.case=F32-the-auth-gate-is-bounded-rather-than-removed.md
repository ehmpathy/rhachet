# fulcrum F32 — the socket's same-user auth gate is BOUNDED rather than removed

- rework = dirty
- status = open
- confidence = 82%

## .the fork, stated fairly

a joker `clone say` wedged 30s with `acksSeen: []` — the server never acked, so the stall sat before
the first frame. the one step there is the per-connection same-user auth gate, which shells out to
`ss -xp` (a host-wide unix-socket scan, each socket mapped to the pid that holds it). two repairs:

| option | what it does | cost | risk |
|---|---|---|---|
| **A — bound it** | race the check against a stated bound; NACK `auth-gate-timeout` on expiry, `auth-denied` on refusal | the scan stays, per connection | 🟢 strictly safer than today — a bound can only refuse MORE, and no invariant moves |
| **B — remove it** | assert the socket dir is `0700` + own-uid at BIND time, once, then drop the scan | the scan goes entirely; the accept path writes its first frame with no async wait | 🔴 trades an explicit per-connection check for an inferred filesystem guarantee |

## .taken, and why at the time

**A.** three reasons, in order:

1. **it is the only option that is strictly safe.** a bound adds a refusal path and removes none, so
   it cannot admit a caller today's code refuses. B narrows the auth surface, and a narrowed auth
   surface is not mine to narrow alone
2. **`F03` already reserves this call.** the vision records that the clone socket's read and auth
   surface is the wisher's to amend (`define.invariant.clone-socket-brain-cli-only`). B is exactly
   that amendment, re-asked from the cost side
3. **A cures the measured defect.** the 30s silence was a **failhide**, never a latency complaint —
   the client could not name its own cause. A converts it into a classed, named, bounded reject, so
   `rule.forbid.failhide` and `rule.require.failfast` are both satisfied without B

⇒ A shipped with its clamp: `awaitCloneAuthGate` takes the check INJECTED, so the bound is provable
with a promise that never settles — no socket, no host scan, no second unix user. teeth proven by
revert: un-bounded → 2 red; bounded → 10 green.

## .rework, and why

**dirty.** B is not a swap of one line for another:

- `getSocketPeerCred` has callers beyond this gate, so its removal here does not retire it
- the bind path grows a new refusal, with its own reason slug, its own copy, and its own clamp
- the correctness argument rests on an assumption about **where the socket lives** (`XDG_RUNTIME_DIR`,
  mode `0700`). a clone bound to a repo-local or shared path has no such protection, so B without the
  bind-time assertion is a real regression — and the assertion is the part that ripples

## 🔴 .the conjecture was REFUTED — the bound stands, its premise does not

**measured 2026-09-19T00:01Z, the very next tier run after A shipped.** the same wedge recurred:

```
"wedgedMs": 30000, "reachCause": "wedged", "acksSeen": [], "silentMs": 30013
```

⇒ **the 8s auth-gate bound did NOT fire.** had the stall sat in that gate, the say would have read
`rejected: auth-gate-timeout` at 8s rather than wedged at 30s. so the gate is not where the silence
is, and the `ss` conjecture below is **dead as a cause**.

and the same run carried a second observation the earlier one did not:

```
😶 clone probe fault — degraded to feed-not-live: 💥 clone get read timed out { replyMs: 5000 }
```

⇒ **a `get` probe against the SAME clone also got no reply.** a probe is a pure READ: it bypasses the
liveness gate and the write queue entirely. so whatever holds the say also holds a path that shares
almost no code with it — which points past any one handler, at **the daemon's event loop or the
process itself** (a unix listen backlog completes `connect()` in the kernel, so a client sees
"connected, wrote, no answer" from a process whose loop never runs).

🟡 **A is still correct and stays.** it closes a real failhide — an unbounded, unnamed wait on the
accept path — and its clamp proves the bound bites. what it is NOT is a fix for this wedge, and to
have kept quiet about that would be exactly the mis-attribution
`rule.forbid.mechanism-inferred-from-outcome` names: *a bound honored is not a fix demonstrated.*

### 🔴 the event-loop conjecture is REFUTED — the loop was healthy, and now provably so

**measured 2026-09-19T00:34Z**, the run after the liveness discriminator shipped. two clone daemons,
two durable logs, and each holds exactly one line:

```
clone daemon loop watch live (tick 1000ms, stall past 2000ms)
```

⇒ **the watch RAN** (the liveness line is its proof) **and the loop never drifted past 2s** across
either clone's whole lifetime. so the silence in the earlier run means *healthy*, never *unwatched* —
the question the section below left open is now closed, and **the daemon's event loop is off the
list**.

🟡 the wedge did not recur on that run either (5 passed / 2 failed, no 30s silence), so the wedge
class stays open. what is settled is one candidate mechanism, by measurement rather than by absence
(`rule.forbid.mechanism-inferred-from-outcome`).

### 🟡 the narrowed read that got it there — kept, because the refutation is only legible beside it

**measured 2026-09-19T00:30Z**, single-suite repro (98s, 2 passed / 5 failed) with a loop-lag watch
live in the daemon (`genCloneLoopLagWatch`, tick 1s, stall past 2s) and the trace sink tee'd to a
durable per-day log (`getCloneTraceSink` → `writeCloneTraceLine`):

```
.temp/…clone-screen-dogfood.0aa076b9/.agent/.cache/repo=rhachet/skill=clone-say/daemon.2026-09-19.log
  😶 clone probe fault — degraded to feed-not-live: 💥 clone get read timed out { replyMs: 1000 }
  😶 clone probe fault — degraded to feed-not-live: 💥 clone get read timed out { replyMs: 5000 }
```

⇒ **two lines, and BOTH are say-client probe degrades.** the daemon contributed not one line: no stall
past 2s, no dropped ack, no auth fault, no bind fault, no server error.

🟡 **that was NOT yet a proof the loop was healthy.** an absent stall line and a watch that never ran
write the identical log, so to read the silence as health would be the very inference this fulcrum was
corrected for. the discriminator — one liveness line per clone lifetime — shipped after that run, and
the section above is the run that exercised it.

⇒ what this run DID establish on its own: the trace path works in the repro's repo (the client wrote
to it), so the daemon's silence is a real observation about the daemon rather than about the sink.

⇒ the hunt's next candidate is host contention / the socket-client seam. see
`.dream/2026_09_19.a-probe-and-a-say-go-silent-together-against-one-live-clone.dream.md`.

## .confidence, and why it is not higher

**82% at authorship; the `ss` row is now refuted** (see above). what was measured, and what was
conjecture, stated apart — kept verbatim, because the refutation is only legible beside the claim:

| certain (measured) | conjecture |
|---|---|
| no frame reached the client for 30s (`acksSeen: []`, `silentMs: 30092`) | that `execAsync`'s promise hangs PAST its own 5s timeout because `exec` waits for stdio EOF as well as exit, so a killed shell whose `ss` grandchild outlives it and holds the stdout pipe never settles |
| the only step between accept and the first frame is this gate | that host contention (3 live brains, 15+ stale LIVE clones) is what made the scan slow on that run |
| the gate awaits a subprocess whose cost scales with host process + fd count | — |
| the marker LANDED — attempt 2 of 3, exit 0 | — |

🟡 **the 5s inner timeout should have rejected at 5s, not 30s**, so a plain `ss` slowness does not by
itself explain the observation. that gap is why this is 82% and not 95%: the mechanism's *exact*
shape is unproven. what IS proven is the structural defect — **an unbounded, unobservable wait before
the accept path writes its first frame** — and A repairs that whichever way the conjecture lands
(`rule.forbid.mechanism-inferred-from-outcome`).

## .where

- `src/domain.operations/clone/socket/awaitCloneAuthGate.ts` — the bound (A, shipped)
- `src/domain.operations/clone/socket/awaitCloneAuthGate.test.ts` — its clamp, `[case4]`
- `src/domain.operations/clone/socket/genCloneSocketServer.ts` — the accept path that routes through it
- `src/domain.operations/clone/socket/constants.ts` — `CLONE_AUTH_GATE_TIMEOUT_MS`,
  `CLONE_LOOP_LAG_TICK_MS`, `CLONE_LOOP_LAG_THRESHOLD_MS`
- `src/domain.operations/clone/genCloneLoopLagWatch.ts` + `.test.ts` — the loop-lag instrument, teeth
  proven against a real blocked loop (`[case2]`, 7 green)
- `src/domain.operations/clone/getCloneTraceLogPath.ts` + `writeCloneTraceLine.ts` — the durable trace
  tee that made the daemon's own channel readable at all (a grep for daemon trace lines across every
  extant acceptance log returned ZERO before it)
- `src/domain.operations/clone/socket/computeCloneOperationalRejectClass.ts` — `auth-gate-timeout`, `auth-denied`
- `.dream/2026_09_18.the-clone-socket-re-derives-per-connection-what-the-filesystem-guarantees.dream.md` — option B, with the shape of its fix

## .the verdict, once ruled

(unruled)
