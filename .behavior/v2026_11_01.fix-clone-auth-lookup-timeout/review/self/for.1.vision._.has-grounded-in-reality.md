# self review — 1.vision — has-grounded-in-reality

## issues found, and how each was fixed

1. **fabricated before-stdout.** the vision showed `✋ rejected (auth-denied)` with an invented hint.
   the real copy is `CLONE_OPERATIONAL_REJECT_COPY['auth-denied']`
   (`computeCloneOperationalRejectClass.ts:65-66`), and `auth-denied` is classed server-fault
   (not in `CLONE_CALLER_AMENDABLE_REJECT_REASONS`, line 38-39), so it surfaces as a
   `💥 MalfunctionError`, exit 1. fixed: the block now quotes the real copy under the right glyph
   and class, and cites the source, with the frame marked as a sketch.
2. **fabricated after-stdout.** the vision showed `🫡 delivered`. the real success line is
   `😶🎙️ said to ${addressShown}` (`computeCloneSayReport.ts:189`, locked in
   `computeCloneSayReport.test.ts:29`). fixed in the block and the before/after table.
3. **off-by-two line cite.** `getSocketPeerCred.ts:64-67` → the `execAsync` call with
   `timeout: 5000` sits at 66-69 (grepsafe hit at :68). fixed.

lesson: an illustrated stdout is a claim about the contract. grep the copy before you draw it.

## non-issues, and why each holds

- `awaitCloneAuthGate.ts:63-71` — a throw maps to `verdict: 'deny'` (grepsafe hit `:65`). holds.
- `constants.ts:150` — `CLONE_AUTH_GATE_TIMEOUT_MS = 8_000`, docblock 125-149 states it sits above
  the 5s exec timeout. holds; read in full.
- `genCloneSocketServer.ts:343-369` — deny → `reply(socket, 'rejected', 'auth-denied')` at :364,
  timeout → `auth-gate-timeout` at :359. holds; read in full.
- `isCallerSameUser.ts` is the sole caller of `getSocketPeerCred` — grepsafe over `src` for
  `getSocketPeerCred` shows only `isCallerSameUser.ts`, plus docblock mentions. holds.
- the 30s wedge floor — `CLONE_WEDGED_TIMEOUT_FLOOR_MS = 30_000` (`constants.ts:114`) via
  `computeCloneWedgedTimeout`, used as `timeoutMs` in `sayClone.ts:61-96`. the "client gives up
  first" claim rests on this, and on the read of the server accept path: no frame is written
  before the gate settles (`genCloneSocketServer.ts:343-369`). holds.
- keyrack daemon 5s bound — `getSocketPeerPid.ts:79` `timeout: 5000`. holds.
- external: node's `exec` `timeout` kills the child (SIGTERM by default) and rejects with
  `Command failed: <cmd>`. the issue's own trace (`Command failed: ss -xp | grep -E "…" || true`
  with an empty stderr) matches that shape. no other external dependency.
- vocab: the vision reuses extant terms — `auth-denied`, `auth-gate-timeout`, `wedge`,
  `acksSeen`, `fail closed`, `clamp`. the one new name, `SOCKET_PEER_CRED_LOOKUP_TIMEOUT_MS`,
  follows the `CLONE_*_TIMEOUT_MS` / `*_MS` constant pattern in `constants.ts`.
- the clamp method (fake `ss` on `PATH`) rests on `exec` via `/bin/sh -c`, which resolves `ss`
  through `PATH` from `process.env`. not yet run; execution proves it first, and fulcrum F5
  records it.
